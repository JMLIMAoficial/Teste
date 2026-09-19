import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PhotoUrls, StorageService } from '../storage/storage.service';

type PhotoWithAsset = {
  isCover: boolean;
  isProfile?: boolean;
  sortOrder: number;
  mediaAsset: { storagePath: string };
};

function isMainPhoto(p: PhotoWithAsset) {
  return !!(p.isProfile || p.isCover);
}

@Injectable()
export class CoverPhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Foto única principal: cards e página pública usam a mesma. */
  pickMainStoragePath(photos: PhotoWithAsset[]): string | undefined {
    const main = photos.find((p) => isMainPhoto(p));
    if (main) return main.mediaAsset.storagePath;

    const ranked = photos.slice().sort((a, b) => a.sortOrder - b.sortOrder);
    return ranked[0]?.mediaAsset.storagePath;
  }

  /** @deprecated Use pickMainStoragePath — mantido para compatibilidade. */
  pickCoverStoragePath(photos: PhotoWithAsset[]): string | undefined {
    return this.pickMainStoragePath(photos);
  }

  /** @deprecated Use pickMainStoragePath — mantido para compatibilidade. */
  pickBannerStoragePath(photos: PhotoWithAsset[]): string | undefined {
    return this.pickMainStoragePath(photos);
  }

  /** Resolve a foto principal de cada perfil para cards/listagens. */
  async resolveCoverPhotoMap(profileIds: string[]): Promise<Map<string, PhotoUrls>> {
    if (profileIds.length === 0) return new Map<string, PhotoUrls>();

    // Prefer main/cover only — avoid loading every album photo for list cards.
    const mainPhotos = await this.prisma.photo.findMany({
      where: {
        profileId: { in: profileIds },
        status: 'approved',
        OR: [{ isCover: true }, { isProfile: true }],
      },
      include: { mediaAsset: true },
      orderBy: [{ sortOrder: 'asc' }],
    });

    const profilePaths = new Map<string, string>();
    for (const photo of mainPhotos) {
      if (profilePaths.has(photo.profileId)) continue;
      profilePaths.set(photo.profileId, photo.mediaAsset.storagePath);
    }

    const missing = profileIds.filter((id) => !profilePaths.has(id));
    if (missing.length > 0) {
      const fallbacks = await this.prisma.photo.findMany({
        where: { profileId: { in: missing }, status: 'approved' },
        include: { mediaAsset: true },
        orderBy: [{ sortOrder: 'asc' }],
      });
      for (const photo of fallbacks) {
        if (profilePaths.has(photo.profileId)) continue;
        profilePaths.set(photo.profileId, photo.mediaAsset.storagePath);
      }
    }

    const urlCache = new Map<string, PhotoUrls>();
    await Promise.all(
      [...new Set(profilePaths.values())].map(async (storagePath) => {
        urlCache.set(storagePath, await this.storage.resolvePhotoUrls(storagePath));
      }),
    );

    const map = new Map<string, PhotoUrls>();
    for (const [profileId, storagePath] of profilePaths) {
      map.set(profileId, urlCache.get(storagePath)!);
    }
    return map;
  }
}
