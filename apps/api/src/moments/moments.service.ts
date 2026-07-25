import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MomentMediaType } from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { randomUUID } from 'crypto';

@Injectable()
export class MomentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly analytics: AnalyticsService,
  ) {}

  async uploadForUser(
    userId: string,
    file: Express.Multer.File,
    caption?: string,
    mediaType?: MomentMediaType,
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');

    const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/webm'];
    const allowed = [...imageTypes, ...videoTypes];

    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Formato não suportado.');
    }

    const isVideo = videoTypes.includes(file.mimetype);
    const maxSize = isVideo ? 30 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(`Arquivo muito grande (máx. ${isVideo ? '30' : '10'}MB)`);
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const ext =
      file.mimetype === 'video/webm'
        ? 'webm'
        : file.mimetype === 'video/mp4'
          ? 'mp4'
          : file.mimetype.split('/')[1] === 'jpeg'
            ? 'jpg'
            : file.mimetype.split('/')[1];

    const storagePath = `moments/${profile.id}/${randomUUID()}.${ext}`;
    await this.storage.upload(storagePath, file.buffer, file.mimetype);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        ownerType: 'moment',
        storagePath,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        status: 'ready',
      },
    });

    const moment = await this.prisma.moment.create({
      data: {
        profileId: profile.id,
        mediaAssetId: asset.id,
        mediaType: mediaType ?? (isVideo ? 'video' : 'photo'),
        caption: caption?.slice(0, 300),
        status: 'approved',
        publishedAt: new Date(),
      },
      include: { mediaAsset: true },
    });

    await this.analytics.recalculateHotScore(profile.id);

    return this.toMomentDto(moment, profile.displayName, profile.slug);
  }

  async listOwn(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const moments = await this.prisma.moment.findMany({
      where: { profileId: profile.id, deletedAt: null },
      include: { mediaAsset: true },
      orderBy: { createdAt: 'desc' },
    });

    return { data: moments.map((m) => this.toMomentDto(m, profile.displayName, profile.slug)) };
  }

  async getOwnStats(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const [aggregate, approvedMoments, pendingMoments] = await Promise.all([
      this.prisma.moment.aggregate({
        where: { profileId: profile.id, deletedAt: null },
        _sum: { viewCount: true, likeCount: true, commentCount: true },
        _count: { id: true },
      }),
      this.prisma.moment.count({
        where: { profileId: profile.id, status: 'approved', deletedAt: null },
      }),
      this.prisma.moment.count({
        where: { profileId: profile.id, status: 'pending', deletedAt: null },
      }),
    ]);

    return {
      totalMoments: aggregate._count.id,
      approvedMoments,
      pendingMoments,
      totalViews: aggregate._sum.viewCount ?? 0,
      totalLikes: aggregate._sum.likeCount ?? 0,
      totalComments: aggregate._sum.commentCount ?? 0,
    };
  }

  async trackView(momentId: string, sessionId?: string) {
    const moment = await this.prisma.moment.findFirst({
      where: { id: momentId, status: 'approved', deletedAt: null },
    });
    if (!moment) return { tracked: false };

    await this.analytics.track('MomentViewed', {
      profileId: moment.profileId,
      sessionId,
      metadata: { momentId },
    });

    return { tracked: true };
  }

  async getFeed(limit = 20, offset = 0) {
    const moments = await this.prisma.moment.findMany({
      where: {
        status: 'approved',
        deletedAt: null,
        profile: { status: 'approved', isPublic: true },
      },
      include: {
        mediaAsset: true,
        profile: { include: { location: true } },
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    });

    return {
      data: moments.map((m) =>
        this.toMomentDto(m, m.profile.displayName, m.profile.slug, m.profile.location),
      ),
      total: moments.length,
    };
  }

  async listByProfileSlug(slug: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { slug, status: 'approved', isPublic: true, deletedAt: null },
    });
    if (!profile) return { data: [], total: 0 };

    const moments = await this.prisma.moment.findMany({
      where: { profileId: profile.id, status: 'approved', deletedAt: null },
      include: { mediaAsset: true },
      orderBy: { publishedAt: 'desc' },
      take: 12,
    });

    return {
      data: moments.map((m) => this.toMomentDto(m, profile.displayName, profile.slug)),
      total: moments.length,
    };
  }

  toMomentDto(
    moment: {
      id: string;
      caption: string | null;
      status: string;
      mediaType: MomentMediaType;
      viewCount: number;
      likeCount: number;
      commentCount: number;
      publishedAt: Date | null;
      createdAt: Date;
      mediaAsset: { storagePath: string; mimeType: string };
    },
    profileName: string,
    profileSlug: string,
    location?: { city: string; state: string } | null,
  ) {
    return {
      id: moment.id,
      caption: moment.caption,
      status: moment.status,
      mediaType: moment.mediaType,
      url: this.storage.getPublicUrl(moment.mediaAsset.storagePath),
      mimeType: moment.mediaAsset.mimeType,
      viewCount: moment.viewCount,
      likeCount: moment.likeCount,
      commentCount: moment.commentCount,
      profileName,
      profileSlug,
      city: location ? `${location.city}, ${location.state}` : undefined,
      publishedAt: moment.publishedAt ?? moment.createdAt,
      createdAt: moment.createdAt,
    };
  }
}
