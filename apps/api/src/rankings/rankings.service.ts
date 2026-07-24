import { Injectable } from '@nestjs/common';
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
    const profiles = await this.prisma.profile.findMany({
      where: { status: 'approved', isPublic: true, deletedAt: null },
      include: { location: true, tags: true },
      take: 100,
    });

    const hotScores = await this.prisma.hotScore.findMany({
      where: { profileId: { in: profiles.map((p) => p.id) } },
    });
    const hotMap = new Map(hotScores.map((h) => [h.profileId, h]));
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
        coverPhotoUrl: cover?.coverPhotoUrl ?? null,
        coverPhotoThumbUrl: cover?.coverPhotoThumbUrl ?? null,
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

    entries.sort((a, b) => Number(b.metric) - Number(a.metric));

    if (type === 'premium') {
      const premiumOnly = entries.filter((e) => e.isPremium);
      return {
        type,
        data: premiumOnly.slice(0, limit).map((e, i) => ({
          position: i + 1,
          ...e,
        })),
        total: premiumOnly.length,
      };
    }

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
