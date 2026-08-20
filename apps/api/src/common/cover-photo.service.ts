import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PhotoUrls, StorageService } from '../storage/storage.service';

type PhotoWithAsset = {
  isCover: boolean;
  isProfile?: boolean;
  sortOrder: number;
  mediaAsset: { storagePath: string };
};

@Injectable()
export class CoverPhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Foto usada nos cards / listagens (perfil). */
  pickCoverStoragePath(photos: PhotoWithAsset[]): string | undefined {
    const ranked = photos.slice().sort((a, b) => {
      const aProfile = a.isProfile ? 1 : 0;
      const bProfile = b.isProfile ? 1 : 0;
      if (aProfile !== bProfile) return bProfile - aProfile;
      if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
    return ranked[0]?.mediaAsset.storagePath;
  }

  /** Foto usada no topo da página pública (capa). */
  pickBannerStoragePath(photos: PhotoWithAsset[]): string | undefined {
    const ranked = photos.slice().sort((a, b) => {
      if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
      const aProfile = a.isProfile ? 1 : 0;
      const bProfile = b.isProfile ? 1 : 0;
      if (aProfile !== bProfile) return bProfile - aProfile;
      return a.sortOrder - b.sortOrder;
    });
    return ranked[0]?.mediaAsset.storagePath;
  }

  async resolveCoverPhotoMap(profileIds: string[]): Promise<Map<string, PhotoUrls>> {
    if (profileIds.length === 0) return new Map<string, PhotoUrls>();

    const photos = await this.prisma.photo.findMany({
      where: { profileId: { in: profileIds }, status: 'approved' },
      include: { mediaAsset: true },
      orderBy: [{ isProfile: 'desc' }, { isCover: 'desc' }, { sortOrder: 'asc' }],
    });

    const profilePaths = new Map<string, string>();
    for (const photo of photos) {
      if (!profilePaths.has(photo.profileId)) {
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
