import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ProfilePosition } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, type Index } from 'meilisearch';
import { PrismaService } from '../prisma/prisma.service';
import { CoverPhotoService } from '../common/cover-photo.service';
import { computeHotScore, effectiveProfileStatus, toPublicCard } from '../common/profile.mapper';
import type { PhotoUrls } from '../storage/storage.service';

export type SearchSort =
  | 'relevancia'
  | 'populares'
  | 'hotscore'
  | 'visualizacoes'
  | 'recentes'
  | 'premium'
  | 'destaque';

export type SearchFilters = {
  city?: string;
  state?: string;
  premium?: boolean;
  featured?: boolean;
  verified?: boolean;
  preference?: string;
  position?: string;
  neighborhood?: string;
  tag?: string;
  sort?: SearchSort;
  limit?: number;
  offset?: number;
};

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch | null = null;
  private index: Index | null = null;
  private readonly indexName = 'profiles';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly coverPhoto: CoverPhotoService,
  ) {}

  async onModuleInit() {
    const url = this.config.get('MEILISEARCH_URL');
    const key = this.config.get('MEILISEARCH_KEY');
    if (!url) return;

    try {
      this.client = new MeiliSearch({ host: url, apiKey: key });
      this.index = this.client.index(this.indexName);
      await this.index.updateFilterableAttributes([
        'city',
        'state',
        'neighborhood',
        'isPremium',
        'isFeatured',
        'isVerified',
        'sexualPreference',
        'position',
        'tags',
      ]);
      await this.index.updateSortableAttributes([
        'hotScore',
        'viewCount',
        'isPremium',
        'isFeatured',
        'createdAt',
      ]);
      this.logger.log('Meilisearch connected');
      await this.reindexAll();
    } catch (err) {
      this.logger.warn(`Meilisearch unavailable: ${err}`);
      this.client = null;
      this.index = null;
    }
  }

  async search(query: string, filters: SearchFilters = {}) {
    const limit = filters.limit ?? 24;
    const offset = filters.offset ?? 0;

    if (this.index) {
      try {
        const filterParts: string[] = [];
        if (filters.city) filterParts.push(`city = "${filters.city}"`);
        if (filters.state) filterParts.push(`state = "${filters.state}"`);
        if (filters.premium) filterParts.push('isPremium = true');
        if (filters.featured) filterParts.push('isFeatured = true');
        if (filters.verified) filterParts.push('isVerified = true');
        if (filters.preference) filterParts.push(`sexualPreference = "${filters.preference}"`);
        if (filters.position) filterParts.push(`position = "${filters.position}"`);
        if (filters.neighborhood) filterParts.push(`neighborhood = "${filters.neighborhood}"`);
        if (filters.tag) filterParts.push(`tags = "${filters.tag}"`);

        const result = await this.index.search(query || '', {
          filter: filterParts.length ? filterParts.join(' AND ') : undefined,
          limit,
          offset,
          sort: this.resolveMeiliSort(filters.sort),
        });

        const hits = result.hits as Array<{ id?: string; coverPhotoUrl?: string | null }>;
        const profileIds = hits.map((h) => h.id).filter((id): id is string => !!id);
        const coverMap = await this.coverPhoto.resolveCoverPhotoMap(profileIds);
        const data = hits.map((hit) => this.mergeCoverUrls(hit, hit.id ? coverMap.get(hit.id) : undefined));

        return {
          data,
          total: result.estimatedTotalHits ?? hits.length,
          source: 'meilisearch' as const,
        };
      } catch (err) {
        this.logger.warn(`Meilisearch search failed: ${err}`);
      }
    }

    return this.searchDatabase(query, filters, limit, offset);
  }

  async reindexAll() {
    const profiles = await this.loadIndexableProfiles();
    if (!this.index) return { indexed: 0 };

    const coverMap = await this.coverPhoto.resolveCoverPhotoMap(profiles.map((p) => p.id));
    const docs = await Promise.all(profiles.map((p) => this.toIndexDoc(p, coverMap.get(p.id))));
    if (docs.length) {
      await this.index.deleteAllDocuments().catch(() => undefined);
      await this.index.addDocuments(docs);
    }
    return { indexed: docs.length };
  }

  async indexProfile(profileId: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { id: profileId, status: 'approved', isPublic: true, deletedAt: null },
      include: {
        location: true,
        tags: true,
      },
    });

    if (!this.index) return;

    if (!profile) {
      await this.index.deleteDocument(profileId).catch(() => undefined);
      return;
    }

    const coverMap = await this.coverPhoto.resolveCoverPhotoMap([profile.id]);
    const doc = await this.toIndexDoc(profile, coverMap.get(profile.id));
    await this.index.addDocuments([doc]);
  }

  async removeProfile(profileId: string) {
    if (!this.index) return;
    await this.index.deleteDocument(profileId).catch(() => undefined);
  }

  private async searchDatabase(
    query: string,
    filters: SearchFilters,
    limit: number,
    offset: number,
  ) {
    const profiles = await this.prisma.profile.findMany({
      where: {
        status: 'approved',
        isPublic: true,
        deletedAt: null,
        ...(filters.premium && { isPremium: true }),
        ...(filters.featured && { isFeatured: true }),
        ...(filters.verified && { isVerified: true }),
        ...(filters.preference && { sexualPreference: filters.preference }),
        ...(filters.position && { position: filters.position as ProfilePosition }),
        ...(filters.city || filters.state || filters.neighborhood
          ? {
              location: {
                ...(filters.city && { city: { contains: filters.city, mode: 'insensitive' as const } }),
                ...(filters.state && { state: filters.state }),
                ...(filters.neighborhood && {
                  neighborhood: { contains: filters.neighborhood, mode: 'insensitive' as const },
                }),
              },
            }
          : {}),
        ...(query
          ? {
              OR: [
                { displayName: { contains: query, mode: 'insensitive' } },
                { bio: { contains: query, mode: 'insensitive' } },
                { location: { city: { contains: query, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: { location: true, tags: true },
      orderBy: this.resolveDatabaseOrder(filters.sort),
      take: limit,
      skip: offset,
    });

    const tagMap = await this.resolveTags(profiles.flatMap((p) => p.tags.map((t) => t.tagId)));
    const coverMap = await this.coverPhoto.resolveCoverPhotoMap(profiles.map((p) => p.id));
    const hotScores = await this.prisma.hotScore.findMany({
      where: { profileId: { in: profiles.map((p) => p.id) } },
    });
    const hotMap = new Map(hotScores.map((h) => [h.profileId, h]));

    let data = profiles.map((p) => {
      const hs = hotMap.get(p.id);
      const cover = coverMap.get(p.id);
      const tags = p.tags
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 3)
        .map((t) => tagMap.get(t.tagId) ?? '')
        .filter(Boolean);

      return toPublicCard({
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
        position: p.position,
        isVerified: p.isVerified,
        coverPhotoUrl: cover?.coverPhotoUrl ?? null,
        coverPhotoThumbUrl: cover?.coverPhotoThumbUrl ?? null,
      });
    });

    if (filters.tag) {
      data = data.filter((d) => d.tags.some((t) => t.toLowerCase() === filters.tag!.toLowerCase()));
    }

    return { data, total: data.length, source: 'database' as const };
  }

  private async loadIndexableProfiles() {
    return this.prisma.profile.findMany({
      where: { status: 'approved', isPublic: true, deletedAt: null },
      include: {
        location: true,
        tags: true,
      },
    });
  }

  private async toIndexDoc(
    profile: {
      id: string;
      slug: string;
      displayName: string;
      birthDate: Date | null;
      bio: string | null;
      sexualPreference: string | null;
      penisSizeCm?: number | null;
      isPremium: boolean;
      isFeatured: boolean;
      isVerified: boolean;
      position?: string | null;
      premiumExpiresAt?: Date | null;
      featuredExpiresAt?: Date | null;
      viewCount: number;
      createdAt: Date;
      location: { city: string; state: string; neighborhood?: string | null } | null;
      tags: Array<{ tagId: string; sortOrder: number }>;
    },
    cover?: PhotoUrls,
  ) {
    const effective = effectiveProfileStatus(profile);
    const tagMap = await this.resolveTags(profile.tags.map((t) => t.tagId));
    const tags = profile.tags
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => tagMap.get(t.tagId) ?? '')
      .filter(Boolean);

    const hs = await this.prisma.hotScore.findUnique({ where: { profileId: profile.id } });
    const hotScore = hs
      ? Number(hs.score)
      : computeHotScore({
          viewCount: profile.viewCount,
          isPremium: effective.isPremium,
          isFeatured: effective.isFeatured,
        });

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
      hotScore,
      hotScoreLevel: hs?.level,
      tags,
      location: profile.location,
      penisSizeCm: profile.penisSizeCm,
      isVerified: profile.isVerified,
      position: profile.position,
      coverPhotoUrl: cover?.coverPhotoUrl ?? null,
      coverPhotoThumbUrl: cover?.coverPhotoThumbUrl ?? null,
    });

    return {
      id: profile.id,
      ...card,
      city: profile.location?.city ?? '',
      state: profile.location?.state ?? '',
      neighborhood: profile.location?.neighborhood ?? '',
      bio: profile.bio ?? '',
      sexualPreference: profile.sexualPreference ?? '',
      position: profile.position ?? '',
      createdAt: Math.floor(profile.createdAt.getTime() / 1000),
    };
  }

  async checkHealth(): Promise<{
    service: string;
    status: 'healthy' | 'degraded' | 'down';
    latencyMs?: number;
    error?: string;
  }> {
    if (!this.client) {
      return { service: 'meilisearch', status: 'degraded', error: 'Not configured' };
    }

    const start = Date.now();
    try {
      await this.client.health();
      return { service: 'meilisearch', status: 'healthy', latencyMs: Date.now() - start };
    } catch (error) {
      return {
        service: 'meilisearch',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private resolveMeiliSort(sort?: SearchSort): string[] {
    switch (sort) {
      case 'visualizacoes':
        return ['viewCount:desc'];
      case 'recentes':
        return ['createdAt:desc'];
      case 'premium':
        return ['isPremium:desc', 'hotScore:desc'];
      case 'destaque':
        return ['isFeatured:desc', 'hotScore:desc'];
      case 'populares':
      case 'hotscore':
        return ['hotScore:desc'];
      case 'relevancia':
      default:
        return ['hotScore:desc'];
    }
  }

  private resolveDatabaseOrder(sort?: SearchSort) {
    switch (sort) {
      case 'visualizacoes':
        return [{ viewCount: 'desc' as const }];
      case 'recentes':
        return [{ createdAt: 'desc' as const }];
      case 'premium':
        return [{ isPremium: 'desc' as const }, { viewCount: 'desc' as const }];
      case 'destaque':
        return [{ isFeatured: 'desc' as const }, { viewCount: 'desc' as const }];
      case 'populares':
      case 'hotscore':
      case 'relevancia':
      default:
        return [{ isFeatured: 'desc' as const }, { viewCount: 'desc' as const }];
    }
  }

  private mergeCoverUrls<T extends { coverPhotoUrl?: string | null; coverPhotoThumbUrl?: string | null }>(
    hit: T,
    cover?: PhotoUrls,
  ): T {
    if (!cover) return hit;
    return {
      ...hit,
      coverPhotoUrl: cover.coverPhotoUrl,
      coverPhotoThumbUrl: cover.coverPhotoThumbUrl,
    };
  }

  private async resolveTags(tagIds: string[]) {
    const unique = [...new Set(tagIds)];
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: unique }, isActive: true },
    });
    return new Map(tags.map((t) => [t.id, t.name]));
  }
}
