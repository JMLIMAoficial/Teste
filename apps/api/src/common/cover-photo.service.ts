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

    const photos = await this.prisma.photo.findMany({
      where: { profileId: { in: profileIds }, status: 'approved' },
      include: { mediaAsset: true },
      orderBy: [{ sortOrder: 'asc' }],
    });

    const byProfile = new Map<string, typeof photos>();
    for (const photo of photos) {
      const list = byProfile.get(photo.profileId) ?? [];
      list.push(photo);
      byProfile.set(photo.profileId, list);
    }

    const profilePaths = new Map<string, string>();
    for (const [profileId, list] of byProfile) {
      const path = this.pickMainStoragePath(list);
      if (path) profilePaths.set(profileId, path);
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
