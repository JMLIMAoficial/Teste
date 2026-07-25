import { Injectable, BadRequestException } from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import { ContactService } from '../common/contact.service';
import { CoverPhotoService } from '../common/cover-photo.service';
import { haversineKm } from '../common/geo.util';
import { toPublicCard, formatMemberSince, buildProfileLocationFields } from '../common/profile.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { parseSocialLinks } from '../common/social-links.util';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly storage: StorageService,
    private readonly contact: ContactService,
    private readonly coverPhoto: CoverPhotoService,
  ) {}

  async listNearby(lat: number, lng: number, _radiusKm = 100, limit = 50) {
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new BadRequestException('Coordenadas inválidas');
    }

    const profiles = await this.prisma.profile.findMany({
      where: {
        status: 'approved',
        isPublic: true,
        deletedAt: null,
      },
      include: { location: true, tags: true },
    });

    const ranked = profiles
      .map((p) => {
        const plat =
          p.location?.latitude != null ? Number(p.location.latitude) : Number.NaN;
        const plng =
          p.location?.longitude != null ? Number(p.location.longitude) : Number.NaN;
        const distanceKm =
          !Number.isNaN(plat) && !Number.isNaN(plng)
            ? haversineKm(lat, lng, plat, plng)
            : undefined;
        return { profile: p, distanceKm };
      })
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, limit);

    const coverMap = await this.coverPhoto.resolveCoverPhotoMap(ranked.map((r) => r.profile.id));

    const tagMap = await this.resolveTags(
      ranked.flatMap((r) => r.profile.tags.map((t) => t.tagId)),
    );
    const hotScores = await this.prisma.hotScore.findMany({
      where: { profileId: { in: ranked.map((r) => r.profile.id) } },
    });
    const hotMap = new Map(hotScores.map((h) => [h.profileId, h]));

    return {
      data: ranked.map(({ profile: p, distanceKm }) => {
        const hs = hotMap.get(p.id);
        const tags = p.tags
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .slice(0, 3)
          .map((t) => tagMap.get(t.tagId) ?? '')
          .filter(Boolean);

        const cover = coverMap.get(p.id);

        return {
          ...toPublicCard({
            slug: p.slug,
            displayName: p.displayName,
            birthDate: p.birthDate,
            sexualPreference: p.sexualPreference,
            isPremium: p.isPremium,
            isFeatured: p.isFeatured,
            premiumExpiresAt: p.premiumExpiresAt,
            featuredExpiresAt: p.featuredExpiresAt,
            viewCount: p.viewCount,
            hotScore: hs ? Number(hs.score) : undefined,
            hotScoreLevel: hs?.level,
            tags,
            location: p.location,
            distanceKm,
            penisSizeCm: p.penisSizeCm,
            position: p.position,
            coverPhotoUrl: cover?.coverPhotoUrl ?? null,
            coverPhotoThumbUrl: cover?.coverPhotoThumbUrl ?? null,
            isVerified: p.isVerified,
          }),
        };
      }),
      total: ranked.length,
      center: { lat, lng },
    };
  }

  async listPublic() {
    const profiles = await this.prisma.profile.findMany({
      where: {
        status: 'approved',
        isPublic: true,
        deletedAt: null,
      },
      include: { location: true, tags: true },
      orderBy: [{ isFeatured: 'desc' }, { isPremium: 'desc' }, { viewCount: 'desc' }],
      take: 50,
    });

    const tagMap = await this.resolveTags(profiles.flatMap((p) => p.tags.map((t) => t.tagId)));
    const hotScores = await this.prisma.hotScore.findMany({
      where: { profileId: { in: profiles.map((p) => p.id) } },
    });
    const hotMap = new Map(hotScores.map((h) => [h.profileId, h]));
    const coverMap = await this.coverPhoto.resolveCoverPhotoMap(profiles.map((p) => p.id));

    return {
      data: profiles.map((p) => {
        const hs = hotMap.get(p.id);
        const tags = p.tags
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .slice(0, 3)
          .map((t) => tagMap.get(t.tagId) ?? '')
          .filter(Boolean);

        const cover = coverMap.get(p.id);

        return toPublicCard({
          slug: p.slug,
          displayName: p.displayName,
          birthDate: p.birthDate,
          sexualPreference: p.sexualPreference,
          isPremium: p.isPremium,
          isFeatured: p.isFeatured,
          premiumExpiresAt: p.premiumExpiresAt,
          featuredExpiresAt: p.featuredExpiresAt,
          viewCount: p.viewCount,
          hotScore: hs ? Number(hs.score) : undefined,
          hotScoreLevel: hs?.level,
          tags,
          location: p.location,
          penisSizeCm: p.penisSizeCm,
          position: p.position,
          coverPhotoUrl: cover?.coverPhotoUrl ?? null,
          coverPhotoThumbUrl: cover?.coverPhotoThumbUrl ?? null,
          isVerified: p.isVerified,
        });
      }),
      total: profiles.length,
    };
  }

  async listSimilar(slug: string, limit = 8) {
    const source = await this.prisma.profile.findFirst({
      where: { slug, status: 'approved', isPublic: true, deletedAt: null },
      include: { location: true, tags: true },
    });

    if (!source) return { data: [], total: 0 };

    const candidates = await this.prisma.profile.findMany({
      where: {
        id: { not: source.id },
        status: 'approved',
        isPublic: true,
        deletedAt: null,
      },
      include: { location: true, tags: true },
      take: 80,
    });

    const sourceTagIds = new Set(source.tags.map((t) => t.tagId));

    const scored = candidates
      .map((candidate) => {
        let score = 0;

        if (
          source.location?.city &&
          candidate.location?.city &&
          source.location.city.toLowerCase() === candidate.location.city.toLowerCase()
        ) {
          score += 25;
        }

        const sharedTags = candidate.tags.filter((t) => sourceTagIds.has(t.tagId)).length;
        score += Math.min(sharedTags, 3) * 15;

        if (
          source.sexualPreference &&
          candidate.sexualPreference &&
          source.sexualPreference === candidate.sexualPreference
        ) {
          score += 20;
        }

        if (candidate.isVerified === source.isVerified && source.isVerified) {
          score += 5;
        }

        return { candidate, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const tagMap = await this.resolveTags(
      scored.flatMap((s) => s.candidate.tags.map((t) => t.tagId)),
    );
    const hotScores = await this.prisma.hotScore.findMany({
      where: { profileId: { in: scored.map((s) => s.candidate.id) } },
    });
    const hotMap = new Map(hotScores.map((h) => [h.profileId, h]));
    const coverMap = await this.coverPhoto.resolveCoverPhotoMap(scored.map((s) => s.candidate.id));

    return {
      data: scored.map(({ candidate, score }) => {
        const hs = hotMap.get(candidate.id);
        const tags = candidate.tags
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .slice(0, 3)
          .map((t) => tagMap.get(t.tagId) ?? '')
          .filter(Boolean);
        const cover = coverMap.get(candidate.id);

        return {
          similarityScore: score,
          profile: toPublicCard({
            slug: candidate.slug,
            displayName: candidate.displayName,
            birthDate: candidate.birthDate,
            sexualPreference: candidate.sexualPreference,
            isPremium: candidate.isPremium,
            isFeatured: candidate.isFeatured,
            premiumExpiresAt: candidate.premiumExpiresAt,
            featuredExpiresAt: candidate.featuredExpiresAt,
            viewCount: candidate.viewCount,
            hotScore: hs ? Number(hs.score) : undefined,
            hotScoreLevel: hs?.level,
            tags,
            location: candidate.location,
            penisSizeCm: candidate.penisSizeCm,
            position: candidate.position,
            coverPhotoUrl: cover?.coverPhotoUrl ?? null,
            coverPhotoThumbUrl: cover?.coverPhotoThumbUrl ?? null,
            isVerified: candidate.isVerified,
          }),
        };
      }),
      total: scored.length,
    };
  }

  async getBySlug(slug: string, sessionId?: string) {
    const profile = await this.prisma.profile.findFirst({
      where: {
        slug,
        status: 'approved',
        isPublic: true,
        deletedAt: null,
      },
      include: {
        location: true,
        pricing: true,
        availability: { orderBy: { dayOfWeek: 'asc' } },
        tags: true,
        photos: {
          where: { status: 'approved' },
          include: { mediaAsset: true },
          orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
        },
      },
    });

    if (!profile) return null;

    await this.analytics.track('ProfileViewed', {
      profileId: profile.id,
      sessionId,
    });

    const tagMap = await this.resolveTags(profile.tags.map((t) => t.tagId));
    const tags = profile.tags
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => tagMap.get(t.tagId) ?? '')
      .filter(Boolean);

    const hs = await this.prisma.hotScore.findUnique({ where: { profileId: profile.id } });
    const coverPath = this.coverPhoto.pickCoverStoragePath(profile.photos);
    const coverUrls = coverPath ? await this.storage.resolvePhotoUrls(coverPath) : null;
    const card = toPublicCard({
      slug: profile.slug,
      displayName: profile.displayName,
      birthDate: profile.birthDate,
      sexualPreference: profile.sexualPreference,
      isPremium: profile.isPremium,
      isFeatured: profile.isFeatured,
      premiumExpiresAt: profile.premiumExpiresAt,
      featuredExpiresAt: profile.featuredExpiresAt,
      viewCount: profile.viewCount,
      hotScore: hs ? Number(hs.score) : undefined,
      hotScoreLevel: hs?.level,
      tags,
      location: profile.location,
      penisSizeCm: profile.penisSizeCm,
      position: profile.position,
      coverPhotoUrl: coverUrls?.coverPhotoUrl ?? null,
      coverPhotoThumbUrl: coverUrls?.coverPhotoThumbUrl ?? null,
      isVerified: profile.isVerified,
    });

    const approvedPhotos = profile.photos.filter((p) => p.status === 'approved');
    const photos = await Promise.all(
      approvedPhotos.map(async (p) => {
        const urls = await this.storage.resolvePhotoUrls(p.mediaAsset.storagePath);
        return {
          id: p.id,
          url: urls.coverPhotoUrl,
          thumbUrl: urls.coverPhotoThumbUrl,
          isCover: p.isCover,
        };
      }),
    );

    return {
      ...card,
      id: profile.id,
      bio: profile.bio,
      viewCount: profile.viewCount,
      preference: profile.sexualPreference,
      position: profile.position,
      penisSizeCm: profile.penisSizeCm,
      tags,
      photos,
      memberSince: formatMemberSince(profile.createdAt),
      socialLinks: parseSocialLinks(profile.socialLinks),
      ...buildProfileLocationFields(profile.location),
      ...this.contact.buildPublicContact(profile.whatsapp, profile.displayName),
      ...this.buildPublicPricing(profile),
      availability: this.buildPublicAvailability(profile.availability),
    };
  }

  private buildPublicPricing(profile: {
    pricingDisplayMode: string;
    pricing: {
      thirtyMin: number | null;
      oneHour: number | null;
      twoHours: number | null;
      overnight: number | null;
      customItems: unknown;
    } | null;
  }) {
    if (profile.pricingDisplayMode === 'hidden') {
      return { pricing: null };
    }
    if (profile.pricingDisplayMode === 'consult') {
      return { pricing: { mode: 'consult' as const } };
    }

    const customItems = (profile.pricing?.customItems as Array<{ label: string; price: number }>) ?? [];
    return {
      pricing: {
        mode: 'show' as const,
        thirtyMin: profile.pricing?.thirtyMin ?? null,
        oneHour: profile.pricing?.oneHour ?? null,
        twoHours: profile.pricing?.twoHours ?? null,
        overnight: profile.pricing?.overnight ?? null,
        customItems,
      },
    };
  }

  private buildPublicAvailability(
    rows: Array<{
      dayOfWeek: number;
      isAvailable: boolean;
      startTime: string | null;
      endTime: string | null;
    }>,
  ) {
    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return rows
      .filter((row) => row.isAvailable && row.startTime && row.endTime)
      .map((row) => ({
        dayOfWeek: row.dayOfWeek,
        label: dayLabels[row.dayOfWeek] ?? String(row.dayOfWeek),
        startTime: row.startTime,
        endTime: row.endTime,
      }));
  }

  private async resolveTags(tagIds: string[]) {
    const unique = [...new Set(tagIds)];
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: unique }, isActive: true },
    });
    return new Map(tags.map((t) => [t.id, t.name]));
  }
}
