import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProfilePosition, PricingDisplayMode } from '@prisma/client';
import { assertMinimumAge } from '../common/age.util';
import { calculateAge, toPublicCard, formatMemberSince, buildProfileLocationFields } from '../common/profile.mapper';
import { CoverPhotoService } from '../common/cover-photo.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ContactService } from '../common/contact.service';
import { GeocodingService } from '../common/geocoding.service';
import { SearchService } from '../search/search.service';
import { UpdateProfileDto, UpdatePricingDto, UpdateAvailabilityDto } from './companion.dto';

type ProfileRecord = {
  id: string;
  slug: string;
  displayName: string;
  birthDate: Date | null;
  bio: string | null;
  sexualPreference: string | null;
  position: ProfilePosition | null;
  penisSizeCm: number | null;
  status: string;
  isPublic: boolean;
  isPremium: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  viewCount: number;
  whatsapp: string | null;
  location: {
    city: string;
    state: string;
    cep: string | null;
    neighborhood?: string | null;
    latitude: unknown;
    longitude: unknown;
  } | null;
  photos: Array<{
    id: string;
    status: string;
    sortOrder: number;
    isCover: boolean;
    mediaAsset: { storagePath: string; mimeType: string };
  }>;
  tags?: Array<{ tagId: string; sortOrder: number }>;
};

@Injectable()
export class CompanionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly contact: ContactService,
    private readonly geocoding: GeocodingService,
    private readonly search: SearchService,
    private readonly coverPhoto: CoverPhotoService,
  ) {}

  async getOwnProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        location: true,
        tags: { orderBy: { sortOrder: 'asc' } },
        photos: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil não encontrado');
    }

    return this.formatProfile(profile);
  }

  async getDashboard(userId: string, period: '7d' | '30d' | '90d' = '30d') {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [viewsInPeriod, whatsappTotal, whatsappInPeriod, hs, reviewAgg] = await Promise.all([
      this.prisma.analyticsEvent.count({
        where: { profileId: profile.id, eventType: 'ProfileViewed', createdAt: { gte: since } },
      }),
      this.prisma.analyticsEvent.count({
        where: { profileId: profile.id, eventType: 'WhatsAppClicked' },
      }),
      this.prisma.analyticsEvent.count({
        where: { profileId: profile.id, eventType: 'WhatsAppClicked', createdAt: { gte: since } },
      }),
      this.prisma.hotScore.findUnique({ where: { profileId: profile.id } }),
      this.prisma.review.aggregate({
        where: { profileId: profile.id, status: 'approved' },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    return {
      period,
      views: { total: profile.viewCount, inPeriod: viewsInPeriod },
      whatsapp: { total: whatsappTotal, inPeriod: whatsappInPeriod },
      hotScore: hs ? { score: Number(hs.score), level: hs.level } : null,
      reviews: {
        averageRating: reviewAgg._avg.rating ? Number(reviewAgg._avg.rating.toFixed(1)) : null,
        count: reviewAgg._count,
      },
    };
  }

  async getPricing(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { pricing: true },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    return {
      pricingDisplayMode: profile.pricingDisplayMode,
      thirtyMin: profile.pricing?.thirtyMin ?? null,
      oneHour: profile.pricing?.oneHour ?? null,
      twoHours: profile.pricing?.twoHours ?? null,
      overnight: profile.pricing?.overnight ?? null,
      customItems: (profile.pricing?.customItems as Array<{ label: string; price: number }>) ?? [],
    };
  }

  async updatePricing(userId: string, dto: UpdatePricingDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { pricing: true },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const displayMode = dto.pricingDisplayMode ?? profile.pricingDisplayMode;
    const values = {
      thirtyMin: dto.thirtyMin !== undefined ? dto.thirtyMin : profile.pricing?.thirtyMin ?? null,
      oneHour: dto.oneHour !== undefined ? dto.oneHour : profile.pricing?.oneHour ?? null,
      twoHours: dto.twoHours !== undefined ? dto.twoHours : profile.pricing?.twoHours ?? null,
      overnight: dto.overnight !== undefined ? dto.overnight : profile.pricing?.overnight ?? null,
      customItems:
        dto.customItems !== undefined
          ? dto.customItems
          : ((profile.pricing?.customItems as Array<{ label: string; price: number }>) ?? []),
    };

    if (displayMode === 'show') {
      const hasPrice =
        [values.thirtyMin, values.oneHour, values.twoHours, values.overnight].some(
          (v) => v != null && v > 0,
        ) || values.customItems.some((item) => item.price > 0);
      if (!hasPrice) {
        throw new BadRequestException('Informe ao menos um valor ou use "Consultar" / "Ocultar"');
      }
    }

    await this.prisma.$transaction([
      this.prisma.profile.update({
        where: { userId },
        data: { pricingDisplayMode: displayMode },
      }),
      this.prisma.profilePricing.upsert({
        where: { profileId: profile.id },
        create: {
          profileId: profile.id,
          ...values,
          customItems: values.customItems as Prisma.InputJsonValue,
        },
        update: {
          ...values,
          customItems: values.customItems as Prisma.InputJsonValue,
        },
      }),
    ]);

    return this.getPricing(userId);
  }

  async getAvailability(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { availability: { orderBy: { dayOfWeek: 'asc' } } },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const byDay = new Map(profile.availability.map((row) => [row.dayOfWeek, row]));
    const days = Array.from({ length: 7 }, (_, dayOfWeek) => {
      const row = byDay.get(dayOfWeek);
      return {
        dayOfWeek,
        isAvailable: row?.isAvailable ?? false,
        startTime: row?.startTime ?? null,
        endTime: row?.endTime ?? null,
      };
    });

    return { days };
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    for (const day of dto.days) {
      if (day.isAvailable) {
        if (!day.startTime || !day.endTime) {
          throw new BadRequestException(`Informe horário de início e fim para o dia ${day.dayOfWeek}`);
        }
        if (day.startTime >= day.endTime) {
          throw new BadRequestException(`Horário inválido para o dia ${day.dayOfWeek}`);
        }
      }
    }

    await this.prisma.$transaction(
      dto.days.map((day) =>
        this.prisma.profileAvailability.upsert({
          where: {
            profileId_dayOfWeek: { profileId: profile.id, dayOfWeek: day.dayOfWeek },
          },
          create: {
            profileId: profile.id,
            dayOfWeek: day.dayOfWeek,
            isAvailable: !!day.isAvailable,
            startTime: day.isAvailable ? day.startTime : null,
            endTime: day.isAvailable ? day.endTime : null,
          },
          update: {
            isAvailable: !!day.isAvailable,
            startTime: day.isAvailable ? day.startTime : null,
            endTime: day.isAvailable ? day.endTime : null,
          },
        }),
      ),
    );

    return this.getAvailability(userId);
  }

  async getPublicPreview(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        location: true,
        tags: { orderBy: { sortOrder: 'asc' } },
        photos: {
          where: { status: 'approved' },
          include: { mediaAsset: true },
          orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil não encontrado');
    }

    const tagMap = await this.resolveTags(profile.tags.map((t) => t.tagId));
    const tags = profile.tags
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
      position: profile.position,
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
      coverPhotoUrl: coverUrls?.coverPhotoUrl ?? null,
      coverPhotoThumbUrl: coverUrls?.coverPhotoThumbUrl ?? null,
      isVerified: profile.isVerified,
    });

    const photos = await Promise.all(
      profile.photos.map(async (p) => {
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
      status: profile.status,
      isPublic: profile.isPublic,
      memberSince: formatMemberSince(profile.createdAt),
      ...buildProfileLocationFields(profile.location),
      photos,
      ...this.contact.buildPublicContact(profile.whatsapp, profile.displayName),
    };
  }

  async updateOwnProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { location: true, tags: true, photos: true },
    });

    if (!profile) {
      throw new NotFoundException('Perfil não encontrado');
    }

    if (dto.birthDate) {
      assertMinimumAge(dto.birthDate);
    }

    let whatsapp: string | undefined;
    if (dto.whatsapp !== undefined) {
      const encrypted = this.contact.encryptPhone(dto.whatsapp);
      whatsapp = encrypted ?? undefined;
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

    let locationWarning: string | undefined;

    if (dto.cep) {
      const geo = await this.geocoding.geocodeCep(dto.cep);
      if (!geo) {
        locationWarning =
          'Não foi possível validar este CEP. Verifique o número — salvamos cidade/estado, mas a proximidade pode não funcionar.';
        locationUpdate = {
          cep: dto.cep,
          neighborhood: dto.neighborhood ?? profile.location?.neighborhood ?? undefined,
          city: dto.city ?? profile.location?.city ?? 'Não informado',
          state: (dto.state ?? profile.location?.state ?? 'SP').toUpperCase(),
          latitude: profile.location?.latitude ? Number(profile.location.latitude) : undefined,
          longitude: profile.location?.longitude ? Number(profile.location.longitude) : undefined,
        };
      } else {
        locationUpdate = {
          cep: geo.cep,
          neighborhood: dto.neighborhood ?? profile.location?.neighborhood ?? undefined,
          city: dto.city ?? geo.city,
          state: (dto.state ?? geo.state).toUpperCase(),
          latitude: geo.latitude,
          longitude: geo.longitude,
        };
      }
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
        where: { userId },
        data: {
          displayName: dto.displayName,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          bio: dto.bio,
          sexualPreference: dto.sexualPreference,
          position: dto.position,
          penisSizeCm: dto.penisSizeCm,
          ...(dto.whatsapp !== undefined && { whatsapp: whatsapp ?? null }),
          ...(locationUpdate && {
            location: {
              upsert: {
                create: locationUpdate,
                update: locationUpdate,
              },
            },
          }),
        },
        include: {
          location: true,
          tags: { orderBy: { sortOrder: 'asc' } },
          photos: { include: { mediaAsset: true }, orderBy: { sortOrder: 'asc' } },
        },
      });

      if (dto.tagIds !== undefined || dto.tagNames !== undefined) {
        await tx.profileTag.deleteMany({ where: { profileId: saved.id } });
        const resolvedTagIds = await this.resolveProfileTagIds(
          tx,
          dto.tagIds ?? [],
          dto.tagNames ?? [],
        );
        if (resolvedTagIds.length > 0) {
          await tx.profileTag.createMany({
            data: resolvedTagIds.map((tagId, index) => ({
              profileId: saved.id,
              tagId,
              sortOrder: index,
            })),
          });
        }
        return tx.profile.findUniqueOrThrow({
          where: { userId },
          include: {
            location: true,
            tags: { orderBy: { sortOrder: 'asc' } },
            photos: { include: { mediaAsset: true }, orderBy: { sortOrder: 'asc' } },
          },
        });
      }

      return saved;
    });

    if (updated.status === 'approved' && updated.isPublic) {
      await this.search.indexProfile(updated.id);
    }

    const formatted = await this.formatProfile(updated);
    return {
      ...formatted,
      ...(locationWarning && { warning: locationWarning }),
    };
  }

  private async formatProfile(profile: ProfileRecord) {
    const phone = this.contact.decryptPhone(profile.whatsapp);
    const tagMap = await this.resolveTags(profile.tags?.map((t) => t.tagId) ?? []);
    const tags = (profile.tags ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => ({
        id: t.tagId,
        name: tagMap.get(t.tagId) ?? '',
      }))
      .filter((t) => t.name);

    const hasAnyPhoto = profile.photos.length > 0;

    const checks = [
      { key: 'birthDate', label: 'Data de nascimento', done: !!profile.birthDate },
      { key: 'bio', label: 'Descrição / biografia', done: (profile.bio?.trim().length ?? 0) >= 20 },
      { key: 'preference', label: 'Preferência sexual', done: !!profile.sexualPreference },
      { key: 'position', label: 'Posição', done: !!profile.position },
      { key: 'penisSizeCm', label: 'Dote (cm)', done: profile.penisSizeCm != null },
      { key: 'location', label: 'Cidade e estado', done: !!(profile.location?.city && profile.location?.state) },
      { key: 'cep', label: 'CEP (proximidade)', done: !!(profile.location?.latitude && profile.location?.longitude) },
      { key: 'photo', label: 'Pelo menos 1 foto', done: hasAnyPhoto },
      { key: 'tags', label: 'Tags do perfil', done: tags.length > 0 },
      { key: 'whatsapp', label: 'WhatsApp', done: !!phone },
    ];

    const doneCount = checks.filter((c) => c.done).length;

    return {
      id: profile.id,
      slug: profile.slug,
      displayName: profile.displayName,
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
      viewCount: profile.viewCount,
      city: profile.location?.city,
      state: profile.location?.state,
      neighborhood: profile.location?.neighborhood ?? null,
      cep: profile.location?.cep,
      hasLocation: !!(profile.location?.latitude && profile.location?.longitude),
      hasWhatsApp: !!phone,
      whatsappMasked: phone ? this.contact.maskPhone(phone) : null,
      tags,
      tagIds: tags.map((t) => t.id),
      photos: await Promise.all(
        profile.photos.map(async (p) => {
          const urls = await this.storage.resolvePhotoUrls(p.mediaAsset.storagePath);
          return {
            id: p.id,
            status: p.status,
            sortOrder: p.sortOrder,
            isCover: p.isCover,
            url: urls.coverPhotoUrl,
            thumbUrl: urls.coverPhotoThumbUrl,
            mimeType: p.mediaAsset.mimeType,
          };
        }),
      ),
      completion: {
        percent: Math.round((doneCount / checks.length) * 100),
        readyForReview: doneCount === checks.length && hasAnyPhoto,
        missing: checks.filter((c) => !c.done).map((c) => c.label),
        checks,
      },
    };
  }

  private slugifyTag(name: string): string {
    return (
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'tag'
    );
  }

  private async resolveProfileTagIds(
    tx: Prisma.TransactionClient,
    tagIds: string[],
    tagNames: string[],
  ): Promise<string[]> {
    const resolved = [...new Set(tagIds)].slice(0, 8);

    if (resolved.length > 0) {
      const validTags = await tx.tag.findMany({
        where: { id: { in: resolved }, isActive: true },
        select: { id: true },
      });
      if (validTags.length !== resolved.length) {
        throw new BadRequestException('Uma ou mais tags são inválidas');
      }
    }

    let category = await tx.tagCategory.findFirst({ where: { slug: 'servicos' } });
    if (!category) {
      category = await tx.tagCategory.create({
        data: { name: 'Serviços', slug: 'servicos', sortOrder: 1 },
      });
    }

    for (const raw of tagNames) {
      if (resolved.length >= 8) break;
      const name = raw.trim().slice(0, 100);
      if (!name) continue;

      const existing = await tx.tag.findFirst({
        where: {
          isActive: true,
          OR: [{ name: { equals: name, mode: 'insensitive' } }, { slug: this.slugifyTag(name) }],
        },
      });

      if (existing) {
        if (!resolved.includes(existing.id)) resolved.push(existing.id);
        continue;
      }

      let slug = this.slugifyTag(name);
      let suffix = 1;
      while (await tx.tag.findUnique({ where: { slug } })) {
        slug = `${this.slugifyTag(name).slice(0, 70)}-${suffix++}`;
      }

      const created = await tx.tag.create({
        data: { name, slug, categoryId: category.id, isActive: true },
      });
      resolved.push(created.id);
    }

    return resolved.slice(0, 8);
  }

  private async resolveTags(tagIds: string[]) {
    if (tagIds.length === 0) return new Map<string, string>();
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: tagIds }, isActive: true },
    });
    return new Map(tags.map((t) => [t.id, t.name]));
  }
}
