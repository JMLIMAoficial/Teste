import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, ProfileStatus } from '@prisma/client';
import { assertMinimumAge } from '../common/age.util';
import { AuthUser } from '../common/auth.types';
import { ContactService } from '../common/contact.service';
import { CoverPhotoService } from '../common/cover-photo.service';
import { GeocodingService } from '../common/geocoding.service';
import { computeProfileCompletion } from '../common/profile-completion.util';
import { calculateAge } from '../common/profile.mapper';
import { AnalyticsService } from '../analytics/analytics.service';
import { CommentsService } from '../comments/comments.service';
import { ReviewsService } from '../reviews/reviews.service';
import { DomainEvents } from '../events/domain-events';
import { AuditService } from '../platform/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { StorageService } from '../storage/storage.service';
import type { AdminListProfilesQueryDto, AdminUpdateProfileDto } from './admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly analytics: AnalyticsService,
    private readonly comments: CommentsService,
    private readonly reviews: ReviewsService,
    private readonly events: EventEmitter2,
    private readonly audit: AuditService,
    private readonly contact: ContactService,
    private readonly coverPhoto: CoverPhotoService,
    private readonly geocoding: GeocodingService,
    private readonly storage: StorageService,
  ) {}

  private async logAction(actor: AuthUser | undefined, action: string, entityType: string, entityId: string, metadata?: Record<string, unknown>) {
    if (!actor) return;
    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      entityType,
      entityId,
      metadata,
    });
  }

  async listPendingProfiles() {
    const profiles = await this.prisma.profile.findMany({
      where: { status: 'pending', deletedAt: null },
      include: {
        location: true,
        photos: true,
        tags: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      data: profiles.map((p) => {
        const completion = computeProfileCompletion({
          birthDate: p.birthDate,
          bio: p.bio,
          sexualPreference: p.sexualPreference,
          position: p.position,
          penisSizeCm: p.penisSizeCm,
          location: p.location,
          photos: p.photos,
          tags: p.tags,
          whatsapp: p.whatsapp,
        });

        return {
          id: p.id,
          slug: p.slug,
          displayName: p.displayName,
          bio: p.bio,
          city: p.location?.city,
          state: p.location?.state,
          createdAt: p.createdAt,
          photoCount: p.photos.length,
          completionPercent: completion.percent,
          readyForReview: completion.readyForReview,
          missing: completion.missing,
        };
      }),
      total: profiles.length,
    };
  }

  async approveProfile(profileId: string, actor?: AuthUser, force = false) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: { location: true, photos: true, tags: true },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const completion = computeProfileCompletion({
      birthDate: profile.birthDate,
      bio: profile.bio,
      sexualPreference: profile.sexualPreference,
      position: profile.position,
      penisSizeCm: profile.penisSizeCm,
      location: profile.location,
      photos: profile.photos,
      tags: profile.tags,
      whatsapp: profile.whatsapp,
    });

    if (!force && !completion.readyForReview) {
      throw new BadRequestException(
        `Perfil incompleto (${completion.percent}%): ${completion.missing.join(', ')}`,
      );
    }

    const updated = await this.prisma.profile.update({
      where: { id: profileId },
      data: { status: 'approved', isPublic: true },
    });

    await this.prisma.photo.updateMany({
      where: { profileId, status: 'pending' },
      data: { status: 'approved' },
    });

    await this.analytics.recalculateHotScore(profileId);
    await this.search.indexProfile(profileId);

    this.events.emit(DomainEvents.ProfileApproved, {
      userId: profile.userId,
      profileId: updated.id,
      slug: profile.slug,
      displayName: profile.displayName,
    });

    await this.logAction(actor, 'profile.approved', 'profile', profileId, { slug: profile.slug });

    return { id: updated.id, status: updated.status, isPublic: updated.isPublic };
  }

  async rejectProfile(profileId: string, reason?: string, actor?: AuthUser) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const updated = await this.prisma.profile.update({
      where: { id: profileId },
      data: { status: 'rejected', isPublic: false, bio: reason ? `[Rejeitado] ${reason}` : profile.bio },
    });

    await this.search.removeProfile(profileId);

    this.events.emit(DomainEvents.ProfileRejected, {
      userId: profile.userId,
      profileId,
      reason,
    });

    await this.logAction(actor, 'profile.rejected', 'profile', profileId, { reason });

    return { id: updated.id, status: updated.status };
  }

  async listApprovedProfiles() {
    const profiles = await this.prisma.profile.findMany({
      where: { status: 'approved', isPublic: true, deletedAt: null },
      include: { location: true },
      orderBy: [{ isVerified: 'desc' }, { displayName: 'asc' }],
      take: 100,
    });

    return {
      data: profiles.map((p) => ({
        id: p.id,
        slug: p.slug,
        displayName: p.displayName,
        city: p.location?.city,
        state: p.location?.state,
        isVerified: p.isVerified,
        isPremium: p.isPremium,
      })),
      total: profiles.length,
    };
  }

  async setProfileVerified(profileId: string, isVerified: boolean, actor?: AuthUser) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const updated = await this.prisma.profile.update({
      where: { id: profileId },
      data: { isVerified },
    });

    await this.search.indexProfile(profileId);

    await this.logAction(
      actor,
      isVerified ? 'profile.verified' : 'profile.unverified',
      'profile',
      profileId,
      { slug: profile.slug },
    );

    return { id: updated.id, slug: updated.slug, isVerified: updated.isVerified };
  }

  private mapProfileInsight(
    profile: {
      id: string;
      slug: string;
      displayName: string;
      viewCount: number;
      isPremium: boolean;
      isVerified: boolean;
      location?: { city: string; state: string } | null;
    },
    extras?: { hotScore?: number | null; hotScoreLevel?: string | null; whatsappClicks?: number },
  ) {
    return {
      id: profile.id,
      slug: profile.slug,
      displayName: profile.displayName,
      city: profile.location?.city,
      state: profile.location?.state,
      viewCount: profile.viewCount,
      hotScore: extras?.hotScore ?? null,
      hotScoreLevel: extras?.hotScoreLevel ?? null,
      whatsappClicks: extras?.whatsappClicks ?? 0,
      isPremium: profile.isPremium,
      isVerified: profile.isVerified,
    };
  }

  private buildDailyTrend(events: { createdAt: Date }[], days: number) {
    const buckets = new Map<string, number>();
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const event of events) {
      const key = event.createdAt.toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([date, count]) => ({ date, count }));
  }

  async getStats() {
    const now = new Date();
    const startOfDay = (offsetDays: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - offsetDays);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const sevenDaysAgo = startOfDay(7);
    const thirtyDaysAgo = startOfDay(30);

    const [
      pending,
      approved,
      rejected,
      blocked,
      totalProfiles,
      users,
      pendingComments,
      pendingReviews,
      pendingVideos,
      pendingMoments,
      premiumCount,
      verifiedCount,
      totalViewsAgg,
      viewsLast7Days,
      viewsLast30Days,
      newProfilesLast7Days,
      newProfilesLast30Days,
      totalWhatsAppClicks,
      topByViews,
      topHotScores,
      whatsappGroups,
      recentProfiles,
      viewEventsLast7Days,
      approvedWithLocation,
    ] = await Promise.all([
      this.prisma.profile.count({ where: { status: 'pending', deletedAt: null } }),
      this.prisma.profile.count({ where: { status: 'approved', isPublic: true, deletedAt: null } }),
      this.prisma.profile.count({ where: { status: 'rejected', deletedAt: null } }),
      this.prisma.profile.count({ where: { status: 'blocked', deletedAt: null } }),
      this.prisma.profile.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.comment.count({ where: { status: 'pending' } }),
      this.prisma.review.count({ where: { status: 'pending' } }),
      this.prisma.video.count({ where: { status: 'pending', deletedAt: null } }),
      this.prisma.moment.count({ where: { status: 'pending', deletedAt: null } }),
      this.prisma.profile.count({
        where: { deletedAt: null, isPremium: true, status: 'approved', isPublic: true },
      }),
      this.prisma.profile.count({
        where: { deletedAt: null, isVerified: true, status: 'approved', isPublic: true },
      }),
      this.prisma.profile.aggregate({
        where: { deletedAt: null, status: 'approved', isPublic: true },
        _sum: { viewCount: true },
      }),
      this.prisma.analyticsEvent.count({
        where: { eventType: 'ProfileViewed', createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.analyticsEvent.count({
        where: { eventType: 'ProfileViewed', createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.profile.count({
        where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.profile.count({
        where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.analyticsEvent.count({ where: { eventType: 'WhatsAppClicked' } }),
      this.prisma.profile.findMany({
        where: { deletedAt: null, status: 'approved', isPublic: true },
        include: { location: true },
        orderBy: { viewCount: 'desc' },
        take: 10,
      }),
      this.prisma.hotScore.findMany({ orderBy: { score: 'desc' }, take: 10 }),
      this.prisma.analyticsEvent.groupBy({
        by: ['profileId'],
        where: { eventType: 'WhatsAppClicked', profileId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { profileId: 'desc' } },
        take: 10,
      }),
      this.prisma.profile.findMany({
        where: { deletedAt: null },
        include: { location: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.analyticsEvent.findMany({
        where: { eventType: 'ProfileViewed', createdAt: { gte: startOfDay(6) } },
        select: { createdAt: true },
      }),
      this.prisma.profile.findMany({
        where: { deletedAt: null, status: 'approved', isPublic: true, location: { isNot: null } },
        include: { location: true },
        take: 500,
      }),
    ]);

    const hotScoreProfileIds = topHotScores.map((h) => h.profileId);
    const whatsappProfileIds = whatsappGroups
      .map((g) => g.profileId)
      .filter((id): id is string => !!id);

    const [hotScoreProfiles, whatsappProfiles, hotScoresForViews] = await Promise.all([
      hotScoreProfileIds.length
        ? this.prisma.profile.findMany({
            where: { id: { in: hotScoreProfileIds }, deletedAt: null },
            include: { location: true },
          })
        : [],
      whatsappProfileIds.length
        ? this.prisma.profile.findMany({
            where: { id: { in: whatsappProfileIds }, deletedAt: null },
            include: { location: true },
          })
        : [],
      topByViews.length
        ? this.prisma.hotScore.findMany({ where: { profileId: { in: topByViews.map((p) => p.id) } } })
        : [],
    ]);

    const profileById = new Map([...hotScoreProfiles, ...whatsappProfiles].map((p) => [p.id, p]));
    const hotScoreByProfileId = new Map(topHotScores.map((h) => [h.profileId, h]));
    const hotScoreForViewsMap = new Map(hotScoresForViews.map((h) => [h.profileId, h]));
    const whatsappCountByProfile = new Map(
      whatsappGroups
        .filter((g) => g.profileId)
        .map((g) => [g.profileId!, g._count._all]),
    );

    const cityCounts = new Map<string, { city: string; state: string; count: number }>();
    for (const p of approvedWithLocation) {
      if (!p.location?.city) continue;
      const key = `${p.location.city}|${p.location.state}`;
      const existing = cityCounts.get(key);
      if (existing) existing.count += 1;
      else cityCounts.set(key, { city: p.location.city, state: p.location.state, count: 1 });
    }
    const topCities = [...cityCounts.values()].sort((a, b) => b.count - a.count).slice(0, 8);

    return {
      pendingProfiles: pending,
      approvedProfiles: approved,
      rejectedProfiles: rejected,
      blockedProfiles: blocked,
      totalProfiles,
      totalUsers: users,
      pendingComments,
      pendingReviews,
      pendingVideos,
      pendingMoments,
      moderationQueue:
        pending + pendingComments + pendingReviews + pendingVideos + pendingMoments,
      insights: {
        totalViews: totalViewsAgg._sum.viewCount ?? 0,
        viewsLast7Days,
        viewsLast30Days,
        totalWhatsAppClicks,
        newProfilesLast7Days,
        newProfilesLast30Days,
        premiumActive: premiumCount,
        verifiedActive: verifiedCount,
        viewsTrend: this.buildDailyTrend(viewEventsLast7Days, 7),
        topByViews: topByViews.map((p) => {
          const hs = hotScoreForViewsMap.get(p.id);
          return this.mapProfileInsight(p, {
            hotScore: hs ? Number(hs.score) : null,
            hotScoreLevel: hs?.level ?? null,
            whatsappClicks: whatsappCountByProfile.get(p.id) ?? 0,
          });
        }),
        topByHotScore: topHotScores
          .map((hs) => {
            const p = profileById.get(hs.profileId);
            if (!p) return null;
            return this.mapProfileInsight(p, {
              hotScore: Number(hs.score),
              hotScoreLevel: hs.level,
              whatsappClicks: whatsappCountByProfile.get(p.id) ?? 0,
            });
          })
          .filter(Boolean),
        topByWhatsAppClicks: whatsappGroups
          .map((g) => {
            if (!g.profileId) return null;
            const p = profileById.get(g.profileId);
            if (!p) return null;
            const hs = hotScoreByProfileId.get(g.profileId);
            return this.mapProfileInsight(p, {
              hotScore: hs ? Number(hs.score) : null,
              hotScoreLevel: hs?.level ?? null,
              whatsappClicks: g._count._all,
            });
          })
          .filter(Boolean),
        recentProfiles: recentProfiles.map((p) => ({
          id: p.id,
          slug: p.slug,
          displayName: p.displayName,
          status: p.status,
          city: p.location?.city,
          state: p.location?.state,
          createdAt: p.createdAt,
        })),
        topCities,
      },
    };
  }

  async listProfiles(query: AdminListProfilesQueryDto) {
    const limit = query.limit ?? 24;
    const offset = query.offset ?? 0;
    const q = query.q?.trim();

    let emailUserIds: string[] = [];
    if (q) {
      const users = await this.prisma.user.findMany({
        where: { email: { contains: q, mode: 'insensitive' }, deletedAt: null },
        select: { id: true },
        take: 50,
      });
      emailUserIds = users.map((u) => u.id);
    }

    const where: Prisma.ProfileWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.premium && { isPremium: true }),
      ...(query.featured && { isFeatured: true }),
      ...(query.verified && { isVerified: true }),
      ...(q && {
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { location: { city: { contains: q, mode: 'insensitive' } } },
          ...(emailUserIds.length ? [{ userId: { in: emailUserIds } }] : []),
        ],
      }),
    };

    const [profiles, total] = await Promise.all([
      this.prisma.profile.findMany({
        where,
        include: {
          location: true,
          photos: {
            include: { mediaAsset: true },
            orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
          },
          tags: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.profile.count({ where }),
    ]);

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(profiles.map((p) => p.userId))] } },
      select: { id: true, email: true },
    });
    const emailByUserId = new Map(users.map((u) => [u.id, u.email]));

    const storagePaths = new Set<string>();
    const coverPathByProfile = new Map<string, string>();
    for (const profile of profiles) {
      const path = this.coverPhoto.pickCoverStoragePath(profile.photos);
      if (path) {
        coverPathByProfile.set(profile.id, path);
        storagePaths.add(path);
      }
    }
    const urlByPath = new Map<string, Awaited<ReturnType<StorageService['resolvePhotoUrls']>>>();
    await Promise.all(
      [...storagePaths].map(async (path) => {
        urlByPath.set(path, await this.storage.resolvePhotoUrls(path));
      }),
    );

    return {
      data: profiles.map((p) => {
        const completion = computeProfileCompletion({
          birthDate: p.birthDate,
          bio: p.bio,
          sexualPreference: p.sexualPreference,
          position: p.position,
          penisSizeCm: p.penisSizeCm,
          location: p.location,
          photos: p.photos,
          tags: p.tags,
          whatsapp: p.whatsapp,
        });
        const coverPath = coverPathByProfile.get(p.id);
        const coverUrls = coverPath ? urlByPath.get(coverPath) : undefined;

        return {
          id: p.id,
          slug: p.slug,
          displayName: p.displayName,
          email: emailByUserId.get(p.userId) ?? '',
          status: p.status,
          isPublic: p.isPublic,
          isPremium: p.isPremium,
          isFeatured: p.isFeatured,
          isVerified: p.isVerified,
          city: p.location?.city,
          state: p.location?.state,
          photoCount: p.photos.length,
          coverPhotoUrl: coverUrls?.coverPhotoUrl ?? null,
          coverPhotoThumbUrl: coverUrls?.coverPhotoThumbUrl ?? null,
          viewCount: p.viewCount,
          completionPercent: completion.percent,
          readyForReview: completion.readyForReview,
          updatedAt: p.updatedAt,
        };
      }),
      total,
      limit,
      offset,
    };
  }

  async getProfileDetail(profileId: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { id: profileId, deletedAt: null },
      include: {
        location: true,
        tags: { orderBy: { sortOrder: 'asc' } },
        photos: {
          include: { mediaAsset: true },
          orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
        },
      },
    });

    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const [user, hotScore, pendingVideos, pendingMoments, tagRecords] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: profile.userId },
        select: { id: true, email: true, displayName: true, lastLoginAt: true },
      }),
      this.prisma.hotScore.findUnique({ where: { profileId } }),
      this.prisma.video.count({ where: { profileId, status: 'pending', deletedAt: null } }),
      this.prisma.moment.count({ where: { profileId, status: 'pending', deletedAt: null } }),
      this.prisma.tag.findMany({
        where: { id: { in: profile.tags.map((t) => t.tagId) }, isActive: true },
      }),
    ]);

    if (!user) throw new NotFoundException('Usuário não encontrado');

    const tagMap = new Map(tagRecords.map((t) => [t.id, t.name]));
    const tags = profile.tags
      .map((t) => ({ id: t.tagId, name: tagMap.get(t.tagId) ?? '' }))
      .filter((t) => t.name);

    const phone = this.contact.decryptPhone(profile.whatsapp);
    const completion = computeProfileCompletion({
      birthDate: profile.birthDate,
      bio: profile.bio,
      sexualPreference: profile.sexualPreference,
      position: profile.position,
      penisSizeCm: profile.penisSizeCm,
      location: profile.location,
      photos: profile.photos,
      tags: profile.tags,
      whatsapp: profile.whatsapp,
    });

    const photos = await Promise.all(
      profile.photos.map(async (p) => {
        const urls = await this.storage.resolvePhotoUrls(p.mediaAsset.storagePath);
        return {
          id: p.id,
          status: p.status,
          sortOrder: p.sortOrder,
          isCover: p.isCover,
          url: urls.coverPhotoUrl,
          thumbUrl: urls.coverPhotoThumbUrl,
        };
      }),
    );

    return {
      id: profile.id,
      userId: profile.userId,
      slug: profile.slug,
      displayName: profile.displayName,
      email: user.email,
      lastLoginAt: user.lastLoginAt,
      birthDate: profile.birthDate?.toISOString().slice(0, 10) ?? null,
      age: calculateAge(profile.birthDate),
      bio: profile.bio,
      sexualPreference: profile.sexualPreference,
      position: profile.position,
      penisSizeCm: profile.penisSizeCm,
      status: profile.status,
      isPublic: profile.isPublic,
      isPremium: profile.isPremium,
      isFeatured: profile.isFeatured,
      isVerified: profile.isVerified,
      premiumExpiresAt: profile.premiumExpiresAt,
      featuredExpiresAt: profile.featuredExpiresAt,
      viewCount: profile.viewCount,
      city: profile.location?.city,
      state: profile.location?.state,
      neighborhood: profile.location?.neighborhood,
      cep: profile.location?.cep,
      hasLocation: !!(profile.location?.latitude && profile.location?.longitude),
      hasWhatsApp: !!phone,
      whatsappMasked: phone ? this.contact.maskPhone(phone) : null,
      tags,
      tagIds: tags.map((t) => t.id),
      photos,
      hotScore: hotScore ? Number(hotScore.score) : null,
      hotScoreLevel: hotScore?.level ?? null,
      pendingVideos,
      pendingMoments,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      completion: {
        percent: completion.percent,
        readyForReview: completion.readyForReview,
        missing: completion.missing,
      },
    };
  }

  async updateProfile(profileId: string, dto: AdminUpdateProfileDto, actor?: AuthUser) {
    const profile = await this.prisma.profile.findFirst({
      where: { id: profileId, deletedAt: null },
      include: { location: true, tags: true },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    if (dto.birthDate) assertMinimumAge(dto.birthDate);

    let whatsapp: string | null | undefined;
    if (dto.whatsapp !== undefined) {
      whatsapp = dto.whatsapp ? this.contact.encryptPhone(dto.whatsapp) ?? null : null;
    }

    let locationUpdate:
      | {
          cep?: string;
          neighborhood?: string;
          city: string;
          state: string;
          latitude?: number;
          longitude?: number;
        }
      | undefined;

    if (dto.cep) {
      const geo = await this.geocoding.geocodeCep(dto.cep);
      locationUpdate = geo
        ? {
            cep: geo.cep,
            neighborhood: dto.neighborhood ?? profile.location?.neighborhood ?? undefined,
            city: dto.city ?? geo.city,
            state: (dto.state ?? geo.state).toUpperCase(),
            latitude: geo.latitude,
            longitude: geo.longitude,
          }
        : {
            cep: dto.cep,
            neighborhood: dto.neighborhood ?? profile.location?.neighborhood ?? undefined,
            city: dto.city ?? profile.location?.city ?? 'Não informado',
            state: (dto.state ?? profile.location?.state ?? 'SP').toUpperCase(),
            latitude: profile.location?.latitude ? Number(profile.location.latitude) : undefined,
            longitude: profile.location?.longitude ? Number(profile.location.longitude) : undefined,
          };
    } else if (dto.city || dto.state || dto.neighborhood) {
      locationUpdate = {
        cep: profile.location?.cep ?? undefined,
        neighborhood: dto.neighborhood ?? profile.location?.neighborhood ?? undefined,
        city: dto.city ?? profile.location?.city ?? 'Não informado',
        state: (dto.state ?? profile.location?.state ?? 'SP').toUpperCase(),
        latitude: profile.location?.latitude ? Number(profile.location.latitude) : undefined,
        longitude: profile.location?.longitude ? Number(profile.location.longitude) : undefined,
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.profile.update({
        where: { id: profileId },
        data: {
          ...(dto.displayName !== undefined && { displayName: dto.displayName }),
          ...(dto.birthDate !== undefined && { birthDate: new Date(dto.birthDate) }),
          ...(dto.bio !== undefined && { bio: dto.bio }),
          ...(dto.sexualPreference !== undefined && { sexualPreference: dto.sexualPreference }),
          ...(dto.position !== undefined && { position: dto.position }),
          ...(dto.penisSizeCm !== undefined && { penisSizeCm: dto.penisSizeCm }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
          ...(dto.isVerified !== undefined && { isVerified: dto.isVerified }),
          ...(dto.isPremium !== undefined && { isPremium: dto.isPremium }),
          ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
          ...(whatsapp !== undefined && { whatsapp }),
          ...(locationUpdate && {
            location: {
              upsert: {
                create: locationUpdate,
                update: locationUpdate,
              },
            },
          }),
        },
      });

      if (dto.tagIds !== undefined) {
        await tx.profileTag.deleteMany({ where: { profileId } });
        const tagIds = [...new Set(dto.tagIds)].slice(0, 8);
        if (tagIds.length > 0) {
          await tx.profileTag.createMany({
            data: tagIds.map((tagId, index) => ({ profileId, tagId, sortOrder: index })),
          });
        }
      }

      return saved;
    });

    if (updated.status === 'approved' && updated.isPublic) {
      await this.analytics.recalculateHotScore(profileId);
      await this.search.indexProfile(profileId);
    } else {
      await this.search.removeProfile(profileId);
    }

    await this.logAction(actor, 'profile.updated', 'profile', profileId, {
      slug: updated.slug,
      status: updated.status,
    });

    return this.getProfileDetail(profileId);
  }

  async listPendingComments() {
    return this.comments.listPending();
  }

  async approveComment(id: string, actor?: AuthUser) {
    const result = await this.comments.approve(id);
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (comment) {
      this.events.emit(DomainEvents.CommentApproved, {
        profileId: comment.profileId,
        commentId: id,
      });
    }
    await this.logAction(actor, 'comment.approved', 'comment', id);
    return result;
  }

  async rejectComment(id: string, actor?: AuthUser) {
    await this.logAction(actor, 'comment.rejected', 'comment', id);
    return this.comments.reject(id);
  }

  async listPendingReviews() {
    return this.reviews.listPending();
  }

  async approveReview(id: string, actor?: AuthUser) {
    const result = await this.reviews.approve(id);
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (review) {
      this.events.emit(DomainEvents.ReviewApproved, {
        profileId: review.profileId,
        reviewId: id,
      });
    }
    await this.logAction(actor, 'review.approved', 'review', id);
    return result;
  }

  async rejectReview(id: string, actor?: AuthUser) {
    await this.logAction(actor, 'review.rejected', 'review', id);
    return this.reviews.reject(id);
  }

  async listPendingVideos() {
    const videos = await this.prisma.video.findMany({
      where: { status: 'pending', deletedAt: null },
      include: { profile: true, mediaAsset: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      data: videos.map((v) => ({
        id: v.id,
        title: v.title,
        profileName: v.profile.displayName,
        profileId: v.profileId,
        createdAt: v.createdAt,
      })),
      total: videos.length,
    };
  }

  async approveVideo(id: string, actor?: AuthUser) {
    const video = await this.prisma.video.update({
      where: { id },
      data: { status: 'approved' },
    });
    await this.analytics.recalculateHotScore(video.profileId);
    await this.logAction(actor, 'video.approved', 'video', id);
    return { id: video.id, status: video.status };
  }

  async rejectVideo(id: string, actor?: AuthUser) {
    const video = await this.prisma.video.update({
      where: { id },
      data: { status: 'rejected' },
    });
    await this.logAction(actor, 'video.rejected', 'video', id);
    return { id: video.id, status: video.status };
  }

  async listPendingMoments() {
    const moments = await this.prisma.moment.findMany({
      where: { status: 'pending', deletedAt: null },
      include: { profile: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      data: moments.map((m) => ({
        id: m.id,
        caption: m.caption,
        profileName: m.profile.displayName,
        profileId: m.profileId,
        mediaType: m.mediaType,
        createdAt: m.createdAt,
      })),
      total: moments.length,
    };
  }

  async approveMoment(id: string, actor?: AuthUser) {
    const moment = await this.prisma.moment.update({
      where: { id },
      data: { status: 'approved', publishedAt: new Date() },
    });
    await this.analytics.recalculateHotScore(moment.profileId);
    await this.logAction(actor, 'moment.approved', 'moment', id);
    return { id: moment.id, status: moment.status };
  }

  async rejectMoment(id: string, actor?: AuthUser) {
    const moment = await this.prisma.moment.update({
      where: { id },
      data: { status: 'rejected' },
    });
    await this.logAction(actor, 'moment.rejected', 'moment', id);
    return { id: moment.id, status: moment.status };
  }

  private async revokeUserSessions(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async blockProfile(profileId: string, reason: string | undefined, actor?: AuthUser) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.deletedAt) throw new NotFoundException('Perfil não encontrado');

    await this.prisma.$transaction([
      this.prisma.profile.update({
        where: { id: profileId },
        data: { status: 'blocked', isPublic: false },
      }),
      this.prisma.user.update({
        where: { id: profile.userId },
        data: {
          status: 'blocked',
          blockedAt: new Date(),
          blockedReason: reason?.trim().slice(0, 500) || 'Bloqueado pela moderação',
        },
      }),
    ]);

    await this.revokeUserSessions(profile.userId);
    await this.search.removeProfile(profileId);
    await this.logAction(actor, 'profile.blocked', 'profile', profileId, { reason });
    return { id: profileId, status: 'blocked' };
  }

  async unblockProfile(profileId: string, actor?: AuthUser) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.deletedAt) throw new NotFoundException('Perfil não encontrado');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: profile.userId },
        data: { status: 'active', blockedAt: null, blockedReason: null },
      }),
      this.prisma.profile.update({
        where: { id: profileId },
        data: { status: 'approved', isPublic: true },
      }),
    ]);

    await this.search.indexProfile(profileId);
    await this.logAction(actor, 'profile.unblocked', 'profile', profileId);
    return { id: profileId, status: 'approved', isPublic: true };
  }

  async deleteProfile(profileId: string, actor?: AuthUser) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.deletedAt) throw new NotFoundException('Perfil não encontrado');

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.profile.update({
        where: { id: profileId },
        data: { deletedAt: now, isPublic: false, status: 'blocked' },
      }),
      this.prisma.user.update({
        where: { id: profile.userId },
        data: { status: 'inactive', deletedAt: now },
      }),
    ]);

    await this.revokeUserSessions(profile.userId);
    await this.search.removeProfile(profileId);
    await this.logAction(actor, 'profile.deleted', 'profile', profileId);
    return { id: profileId, deleted: true };
  }

  async batchModerate(
    type: 'comments' | 'reviews' | 'moments' | 'videos',
    ids: string[],
    action: 'approve' | 'reject',
    actor?: AuthUser,
  ) {
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const id of ids) {
      try {
        if (type === 'comments') {
          if (action === 'approve') await this.approveComment(id, actor);
          else await this.rejectComment(id, actor);
        } else if (type === 'reviews') {
          if (action === 'approve') await this.approveReview(id, actor);
          else await this.rejectReview(id, actor);
        } else if (type === 'moments') {
          if (action === 'approve') await this.approveMoment(id, actor);
          else await this.rejectMoment(id, actor);
        } else if (type === 'videos') {
          if (action === 'approve') await this.approveVideo(id, actor);
          else await this.rejectVideo(id, actor);
        }
        results.push({ id, ok: true });
      } catch (err) {
        results.push({
          id,
          ok: false,
          error: err instanceof Error ? err.message : 'Erro',
        });
      }
    }

    return {
      processed: results.length,
      succeeded: results.filter((r) => r.ok).length,
      results,
    };
  }

  async recalculateAllHotScores() {
    const profiles = await this.prisma.profile.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    for (const profile of profiles) {
      await this.analytics.recalculateHotScore(profile.id);
    }

    return { recalculated: profiles.length };
  }
}
