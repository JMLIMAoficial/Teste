import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { randomUUID } from 'crypto';

@Injectable()
export class VideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async uploadForUser(
    userId: string,
    file: Express.Multer.File,
    meta?: { title?: string; description?: string },
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');

    const allowed = ['video/mp4', 'video/webm'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Formato não suportado. Use MP4 ou WebM.');
    }
    if (file.size > 50 * 1024 * 1024) {
      throw new BadRequestException('Arquivo muito grande (máx. 50MB)');
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const count = await this.prisma.video.count({ where: { profileId: profile.id } });
    if (count >= 10) throw new BadRequestException('Limite de 10 vídeos atingido');

    const ext = file.mimetype === 'video/webm' ? 'webm' : 'mp4';
    const storagePath = `videos/${profile.id}/${randomUUID()}.${ext}`;
    await this.storage.upload(storagePath, file.buffer, file.mimetype);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        ownerType: 'video',
        storagePath,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        status: 'ready',
      },
    });

    const video = await this.prisma.video.create({
      data: {
        profileId: profile.id,
        mediaAssetId: asset.id,
        title: meta?.title,
        description: meta?.description,
        status: 'pending',
      },
      include: { mediaAsset: true },
    });

    return this.toVideoDto(video, profile.displayName);
  }

  async listOwn(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const videos = await this.prisma.video.findMany({
      where: { profileId: profile.id, deletedAt: null },
      include: { mediaAsset: true },
      orderBy: { createdAt: 'desc' },
    });

    return { data: videos.map((v) => this.toVideoDto(v, profile.displayName)) };
  }

  async listGallery(limit = 24, offset = 0) {
    const videos = await this.prisma.video.findMany({
      where: {
        status: 'approved',
        showInGallery: true,
        deletedAt: null,
        profile: { status: 'approved', isPublic: true },
      },
      include: {
        mediaAsset: true,
        profile: { include: { location: true } },
      },
      orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    });

    return {
      data: videos.map((v) => this.toVideoDto(v, v.profile.displayName, v.profile)),
      total: videos.length,
    };
  }

  async listByProfileSlug(slug: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { slug, status: 'approved', isPublic: true, deletedAt: null },
    });
    if (!profile) return { data: [], total: 0 };

    const videos = await this.prisma.video.findMany({
      where: {
        profileId: profile.id,
        status: 'approved',
        showInProfile: true,
        deletedAt: null,
      },
      include: { mediaAsset: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: videos.map((v) => this.toVideoDto(v, profile.displayName)),
      total: videos.length,
    };
  }

  async getById(id: string) {
    const video = await this.prisma.video.findFirst({
      where: { id, status: 'approved', deletedAt: null },
      include: {
        mediaAsset: true,
        profile: { include: { location: true } },
      },
    });
    if (!video) throw new NotFoundException('Vídeo não encontrado');

    await this.prisma.video.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return this.toVideoDto(video, video.profile.displayName, video.profile);
  }

  toVideoDto(
    video: {
      id: string;
      title: string | null;
      description: string | null;
      status: string;
      viewCount: number;
      likeCount: number;
      commentCount: number;
      showInProfile: boolean;
      showInGallery: boolean;
      createdAt: Date;
      mediaAsset: { storagePath: string; mimeType: string };
    },
    profileName: string,
    profile?: { slug: string; location: { city: string; state: string } | null },
  ) {
    return {
      id: video.id,
      title: video.title ?? `${profileName} — Vídeo`,
      description: video.description,
      status: video.status,
      url: this.storage.getPublicUrl(video.mediaAsset.storagePath),
      mimeType: video.mediaAsset.mimeType,
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      commentCount: video.commentCount,
      showInProfile: video.showInProfile,
      showInGallery: video.showInGallery,
      profileName,
      profileSlug: profile?.slug,
      city: profile?.location ? `${profile.location.city}, ${profile.location.state}` : undefined,
      createdAt: video.createdAt,
    };
  }
}
