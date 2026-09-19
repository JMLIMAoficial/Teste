import { Injectable } from '@nestjs/common';
import type { HotScoreLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CoverPhotoService } from '../common/cover-photo.service';
import { toPublicCard } from '../common/profile.mapper';

@Injectable()
export class RankingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coverPhoto: CoverPhotoService,
  ) {}

  async getRankings(type: string = 'hotscore', limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);

    if (type === 'premium') {
      const profiles = await this.prisma.profile.findMany({
        where: { status: 'approved', isPublic: true, deletedAt: null, isPremium: true },
        include: { location: true, tags: true },
        orderBy: [{ viewCount: 'desc' }],
        take,
      });
      return this.buildRankingResponse(type, profiles, take);
    }

    if (type === 'views') {
      const profiles = await this.prisma.profile.findMany({
        where: { status: 'approved', isPublic: true, deletedAt: null },
        include: { location: true, tags: true },
        orderBy: [{ viewCount: 'desc' }],
        take,
      });
      return this.buildRankingResponse(type, profiles, take);
    }

    const hotScores = await this.prisma.hotScore.findMany({
      orderBy: { score: 'desc' },
      take: take * 2,
    });
    const profiles = await this.prisma.profile.findMany({
      where: {
        id: { in: hotScores.map((h) => h.profileId) },
        status: 'approved',
        isPublic: true,
        deletedAt: null,
      },
      include: { location: true, tags: true },
    });
    const order = new Map(hotScores.map((h, i) => [h.profileId, i]));
    profiles.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));

    return this.buildRankingResponse(type, profiles.slice(0, take), take, hotScores);
  }

  private async buildRankingResponse(
    type: string,
    profiles: Array<{
      id: string;
      slug: string;
      displayName: string;
      birthDate: Date | null;
      sexualPreference: string | null;
      isPremium: boolean;
      isFeatured: boolean;
      viewCount: number;
      penisSizeCm: number | null;
      isVerified: boolean;
      location: {
        city: string;
        state: string;
        neighborhood: string | null;
      } | null;
      tags: Array<{ tagId: string; sortOrder: number }>;
    }>,
    limit: number,
    hotScores?: Array<{ profileId: string; score: unknown; level: HotScoreLevel }>,
  ) {
    const hotMap = new Map(
      (hotScores ?? (await this.prisma.hotScore.findMany({
        where: { profileId: { in: profiles.map((p) => p.id) } },
      }))).map((h) => [h.profileId, h]),
    );
    const tagMap = await this.resolveTags(profiles.flatMap((p) => p.tags.map((t) => t.tagId)));
    const coverMap = await this.coverPhoto.resolveCoverPhotoMap(profiles.map((p) => p.id));

    const entries = profiles.map((p) => {
      const hs = hotMap.get(p.id);
      const cover = coverMap.get(p.id);
      const tags = p.tags
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 3)
        .map((t) => tagMap.get(t.tagId) ?? '')
        .filter(Boolean);

      const card = toPublicCard({
        slug: p.slug,
        displayName: p.displayName,
        birthDate: p.birthDate,
        sexualPreference: p.sexualPreference,
        isPremium: p.isPremium,
        isFeatured: p.isFeatured,
        viewCount: p.viewCount,
        hotScore: hs ? Number(hs.score) : undefined,
        hotScoreLevel: hs?.level,
        tags,
        location: p.location,
        penisSizeCm: p.penisSizeCm,
        isVerified: p.isVerified,
        coverPhotoUrl: null,
        coverPhotoThumbUrl: cover?.coverPhotoThumbUrl ?? cover?.coverPhotoUrl ?? null,
      });

      return {
        ...card,
        metric:
          type === 'views'
            ? p.viewCount
            : type === 'premium'
              ? p.isPremium
                ? 1
                : 0
              : hs
                ? Number(hs.score)
                : card.hotScore,
      };
    });

    return {
      type,
      data: entries.slice(0, limit).map((e, i) => ({
        position: i + 1,
        ...e,
      })),
      total: entries.length,
    };
  }

  private async resolveTags(tagIds: string[]) {
    const unique = [...new Set(tagIds)];
    const tags = await this.prisma.tag.findMany({ where: { id: { in: unique } } });
    return new Map(tags.map((t) => [t.id, t.name]));
  }
}
