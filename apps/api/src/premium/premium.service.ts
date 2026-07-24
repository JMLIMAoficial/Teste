import {
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthUser } from '../common/auth.types';
import { effectiveProfileStatus } from '../common/profile.mapper';
import { DomainEvents } from '../events/domain-events';
import { AnalyticsService } from '../analytics/analytics.service';
import { AuditService } from '../platform/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class PremiumService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
    private readonly search: SearchService,
  ) {}

  async onModuleInit() {
    await this.expireStaleStatuses();
  }

  async searchProfiles(query?: string) {
    const profiles = await this.prisma.profile.findMany({
      where: {
        status: 'approved',
        isPublic: true,
        deletedAt: null,
        ...(query?.trim()
          ? {
              OR: [
                { displayName: { contains: query.trim(), mode: 'insensitive' } },
                { slug: { contains: query.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { location: true },
      orderBy: [{ isFeatured: 'desc' }, { isPremium: 'desc' }, { displayName: 'asc' }],
      take: 30,
    });

    return {
      data: profiles.map((p) => {
        const effective = effectiveProfileStatus(p);
        return {
          id: p.id,
          slug: p.slug,
          displayName: p.displayName,
          city: p.location?.city,
          state: p.location?.state,
          isPremium: effective.isPremium,
          isFeatured: effective.isFeatured,
          premiumExpiresAt: p.premiumExpiresAt,
          featuredExpiresAt: p.featuredExpiresAt,
        };
      }),
    };
  }

  async activatePremium(
    profileId: string,
    actor: AuthUser,
    expiresAt?: string,
    note?: string,
  ) {
    const profile = await this.requireProfile(profileId);
    const expiration = expiresAt ? new Date(expiresAt) : null;

    const updated = await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        isPremium: true,
        premiumExpiresAt: expiration,
      },
    });

    await this.afterStatusChange(updated, actor, 'premium.activated', note, {
      expiresAt: expiration?.toISOString() ?? null,
    });

    this.events.emit(DomainEvents.PremiumActivated, {
      userId: profile.userId,
      profileId,
      slug: profile.slug,
      displayName: profile.displayName,
      expiresAt: expiration?.toISOString(),
      activatedBy: actor.id,
    });

    return this.toStatusResponse(updated);
  }

  async deactivatePremium(profileId: string, actor: AuthUser, note?: string) {
    const profile = await this.requireProfile(profileId);

    const updated = await this.prisma.profile.update({
      where: { id: profileId },
      data: { isPremium: false, premiumExpiresAt: null },
    });

    await this.afterStatusChange(updated, actor, 'premium.deactivated', note);

    this.events.emit(DomainEvents.PremiumDeactivated, {
      userId: profile.userId,
      profileId,
      deactivatedBy: actor.id,
    });

    return this.toStatusResponse(updated);
  }

  async activateFeatured(
    profileId: string,
    actor: AuthUser,
    expiresAt?: string,
    note?: string,
  ) {
    const profile = await this.requireProfile(profileId);
    const expiration = expiresAt ? new Date(expiresAt) : null;

    const updated = await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        isFeatured: true,
        featuredExpiresAt: expiration,
      },
    });

    await this.afterStatusChange(updated, actor, 'featured.activated', note, {
      expiresAt: expiration?.toISOString() ?? null,
    });

    this.events.emit(DomainEvents.FeaturedActivated, {
      userId: profile.userId,
      profileId,
      slug: profile.slug,
      displayName: profile.displayName,
      expiresAt: expiration?.toISOString(),
      activatedBy: actor.id,
    });

    return this.toStatusResponse(updated);
  }

  async deactivateFeatured(profileId: string, actor: AuthUser, note?: string) {
    const profile = await this.requireProfile(profileId);

    const updated = await this.prisma.profile.update({
      where: { id: profileId },
      data: { isFeatured: false, featuredExpiresAt: null },
    });

    await this.afterStatusChange(updated, actor, 'featured.deactivated', note);

    this.events.emit(DomainEvents.FeaturedDeactivated, {
      userId: profile.userId,
      profileId,
      deactivatedBy: actor.id,
    });

    return this.toStatusResponse(updated);
  }

  async getCompanionStatus(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { location: true },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const effective = effectiveProfileStatus(profile);
    const hs = await this.prisma.hotScore.findUnique({ where: { profileId: profile.id } });

    return {
      profileId: profile.id,
      slug: profile.slug,
      displayName: profile.displayName,
      status: profile.status,
      isPublic: profile.isPublic,
      city: profile.location?.city,
      isPremium: effective.isPremium,
      isFeatured: effective.isFeatured,
      premiumExpiresAt: profile.premiumExpiresAt,
      featuredExpiresAt: profile.featuredExpiresAt,
      hotScore: hs ? Number(hs.score) : null,
      hotScoreLevel: hs?.level ?? null,
      viewCount: profile.viewCount,
    };
  }

  async expireStaleStatuses() {
    const now = new Date();
    const stale = await this.prisma.profile.findMany({
      where: {
        OR: [
          { isPremium: true, premiumExpiresAt: { lte: now } },
          { isFeatured: true, featuredExpiresAt: { lte: now } },
        ],
      },
    });

    for (const profile of stale) {
      const data: {
        isPremium?: boolean;
        premiumExpiresAt?: null;
        isFeatured?: boolean;
        featuredExpiresAt?: null;
      } = {};

      if (profile.isPremium && profile.premiumExpiresAt && profile.premiumExpiresAt <= now) {
        data.isPremium = false;
        data.premiumExpiresAt = null;
      }
      if (profile.isFeatured && profile.featuredExpiresAt && profile.featuredExpiresAt <= now) {
        data.isFeatured = false;
        data.featuredExpiresAt = null;
      }

      if (Object.keys(data).length === 0) continue;

      await this.prisma.profile.update({ where: { id: profile.id }, data });
      await this.analytics.recalculateHotScore(profile.id);
      await this.search.indexProfile(profile.id);
    }

    return { expired: stale.length };
  }

  private async requireProfile(profileId: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { id: profileId, deletedAt: null },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');
    return profile;
  }

  private async afterStatusChange(
    profile: {
      id: string;
      isPremium: boolean;
      isFeatured: boolean;
      premiumExpiresAt: Date | null;
      featuredExpiresAt: Date | null;
    },
    actor: AuthUser,
    action: string,
    note?: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      entityType: 'profile',
      entityId: profile.id,
      metadata: { note, ...metadata },
    });
    await this.analytics.recalculateHotScore(profile.id);
    await this.search.indexProfile(profile.id);
  }

  private toStatusResponse(profile: {
    id: string;
    isPremium: boolean;
    isFeatured: boolean;
    premiumExpiresAt: Date | null;
    featuredExpiresAt: Date | null;
  }) {
    const effective = effectiveProfileStatus(profile);
    return {
      id: profile.id,
      isPremium: effective.isPremium,
      isFeatured: effective.isFeatured,
      premiumExpiresAt: profile.premiumExpiresAt,
      featuredExpiresAt: profile.featuredExpiresAt,
    };
  }
}
