import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { ImageVariantsService, mediumStoragePath, thumbStoragePath } from '../storage/image-variants.service';
import { StorageService } from '../storage/storage.service';

/** profile/cover/main = mesma foto principal; album = galeria. */
export type PhotoRole = 'profile' | 'cover' | 'main' | 'album';

function isMainRole(role: PhotoRole) {
  return role === 'profile' || role === 'cover' || role === 'main';
}

@Injectable()
export class PhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly imageVariants: ImageVariantsService,
    private readonly search: SearchService,
  ) {}

  async uploadForUser(userId: string, file: Express.Multer.File, role: PhotoRole = 'album') {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatório');
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Formato não suportado. Use JPEG, PNG ou WebP.');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Arquivo muito grande (máx. 10MB)');
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Perfil não encontrado');
    }

    const photoCount = await this.prisma.photo.count({ where: { profileId: profile.id } });
    if (photoCount >= 20) {
      throw new BadRequestException('Limite de 20 fotos atingido');
    }

    const ext = file.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : file.mimetype.split('/')[1];
    const filename = `${randomUUID()}.${ext}`;
    const storagePath = `photos/${profile.id}/${filename}`;

    await this.storage.upload(storagePath, file.buffer, file.mimetype);

    const { thumb, medium } = await this.imageVariants.generateVariants(file.buffer);
    await Promise.all([
      this.storage.upload(thumbStoragePath(storagePath), thumb, 'image/webp'),
      this.storage.upload(mediumStoragePath(storagePath), medium, 'image/webp'),
    ]);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        ownerType: 'photo',
        storagePath,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        status: 'ready',
      },
    });

    const asMain = isMainRole(role);

    const photo = await this.prisma.$transaction(async (tx) => {
      if (asMain) {
        await tx.photo.updateMany({
          where: { profileId: profile.id },
          data: { isProfile: false, isCover: false },
        });
      }

      return tx.photo.create({
        data: {
          profileId: profile.id,
          mediaAssetId: asset.id,
          status: 'pending',
          sortOrder: asMain ? 0 : photoCount,
          isProfile: asMain,
          isCover: asMain,
        },
        include: { mediaAsset: true },
      });
    });

    const urls = await this.storage.resolvePhotoUrls(photo.mediaAsset.storagePath);

    return {
      id: photo.id,
      status: photo.status,
      isCover: photo.isCover,
      isProfile: photo.isProfile,
      url: urls.coverPhotoUrl,
      thumbUrl: urls.coverPhotoThumbUrl,
    };
  }

  /** Define a foto principal (perfil + capa na mesma imagem). */
  async setMain(userId: string, photoId: string) {
    const photo = await this.getOwnedPhoto(userId, photoId);

    await this.prisma.$transaction([
      this.prisma.photo.updateMany({
        where: { profileId: photo.profileId },
        data: { isProfile: false, isCover: false },
      }),
      this.prisma.photo.update({
        where: { id: photoId },
        data: { isProfile: true, isCover: true },
      }),
    ]);

    await this.reindexIfPublic(photo.profileId);
    return { id: photoId, isProfile: true, isCover: true };
  }

  async setCover(userId: string, photoId: string) {
    return this.setMain(userId, photoId);
  }

  async setProfile(userId: string, photoId: string) {
    return this.setMain(userId, photoId);
  }

  async reorderPhotos(userId: string, photoIds: string[]) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const photos = await this.prisma.photo.findMany({
      where: { profileId: profile.id },
      orderBy: { sortOrder: 'asc' },
    });

    if (photoIds.length !== photos.length) {
      throw new BadRequestException('Informe todas as fotos na nova ordem');
    }

    const ownedIds = new Set(photos.map((p) => p.id));
    if (photoIds.some((id) => !ownedIds.has(id))) {
      throw new BadRequestException('Foto inválida para este perfil');
    }

    await this.prisma.$transaction(
      photoIds.map((id, index) =>
        this.prisma.photo.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    await this.reindexIfPublic(profile.id);
    return { success: true };
  }

  async deletePhoto(userId: string, photoId: string) {
    const photo = await this.getOwnedPhoto(userId, photoId);

    await this.prisma.photo.delete({ where: { id: photoId } });

    const remaining = await this.prisma.photo.findMany({
      where: { profileId: photo.profileId },
      orderBy: { sortOrder: 'asc' },
    });

    if (remaining.length === 0) {
      await this.reindexIfPublic(photo.profileId);
      return { deleted: true };
    }

    const updates: Array<ReturnType<typeof this.prisma.photo.update>> = [];
    const hasMain = remaining.some((p) => p.isProfile || p.isCover);

    if (!hasMain) {
      updates.push(
        this.prisma.photo.update({
          where: { id: remaining[0].id },
          data: { isProfile: true, isCover: true },
        }),
      );
    } else {
      // Garante que a principal tenha os dois flags
      const main = remaining.find((p) => p.isProfile || p.isCover)!;
      if (!main.isProfile || !main.isCover) {
        updates.push(
          this.prisma.photo.update({
            where: { id: main.id },
            data: { isProfile: true, isCover: true },
          }),
        );
      }
      for (const p of remaining) {
        if (p.id !== main.id && (p.isProfile || p.isCover)) {
          updates.push(
            this.prisma.photo.update({
              where: { id: p.id },
              data: { isProfile: false, isCover: false },
            }),
          );
        }
      }
    }

    remaining.forEach((p, index) => {
      updates.push(
        this.prisma.photo.update({
          where: { id: p.id },
          data: { sortOrder: index },
        }),
      );
    });

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }

    await this.reindexIfPublic(photo.profileId);
    return { deleted: true };
  }

  private async getOwnedPhoto(userId: string, photoId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const photo = await this.prisma.photo.findFirst({
      where: { id: photoId, profileId: profile.id },
    });
    if (!photo) throw new NotFoundException('Foto não encontrada');

    return { ...photo, profileId: profile.id };
  }

  private async reindexIfPublic(profileId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (profile?.status === 'approved' && profile.isPublic) {
      await this.search.indexProfile(profileId);
    }
  }
}
