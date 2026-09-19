import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ImageVariantsService,
  mediumStoragePath,
  thumbStoragePath,
} from './image-variants.service';
import { StorageService } from './storage.service';

const PORTRAIT_IDS = [
  '1506794778202-cad84cf45f1d',
  '1507003211169-0a1dd7228f2d',
  '1500648767791-00dcc994a43e',
  '1492562080023-ab3db95bfbce',
  '1539571696357-5a69c17a67c6',
  '1519085360753-af0119f7cbe7',
  '1463453091185-61582044d556',
  '1501196354221-bf74ce41073f',
  '1488161628813-0880c8629f94',
];

@Injectable()
export class MediaRestoreService {
  private readonly logger = new Logger(MediaRestoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly imageVariants: ImageVariantsService,
  ) {}

  async restoreMissingPhotos() {
    const photos = await this.prisma.photo.findMany({
      where: { status: 'approved' },
      include: { mediaAsset: true },
      orderBy: [{ sortOrder: 'asc' }],
    });

    let checked = 0;
    let restored = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const photo of photos) {
      const storagePath = photo.mediaAsset.storagePath;
      if (!storagePath || photo.mediaAsset.mimeType.startsWith('video/')) {
        skipped += 1;
        continue;
      }

      checked += 1;
      try {
        const exists = await this.storage.exists(storagePath);
        const thumbOk = await this.storage.exists(thumbStoragePath(storagePath));
        const mediumOk = await this.storage.exists(mediumStoragePath(storagePath));
        if (exists && thumbOk && mediumOk) {
          skipped += 1;
          continue;
        }

        const seed = `${photo.profileId}-${photo.id}`;
        const buffer = await this.downloadPortrait(seed);
        if (!exists) {
          await this.storage.upload(storagePath, buffer, 'image/jpeg');
        }

        const { thumb, medium } = await this.imageVariants.generateVariants(buffer);
        await Promise.all([
          this.storage.upload(thumbStoragePath(storagePath), thumb, 'image/webp'),
          this.storage.upload(mediumStoragePath(storagePath), medium, 'image/webp'),
        ]);
        restored += 1;
        this.logger.log(`Restored ${storagePath}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${storagePath}: ${msg}`);
        this.logger.warn(`Failed ${storagePath}: ${msg}`);
      }
    }

    return { checked, restored, skipped, errors };
  }

  private async downloadPortrait(seed: string): Promise<Buffer> {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    const id = PORTRAIT_IDS[hash % PORTRAIT_IDS.length];

    const sources = [
      `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&h=1200&q=80`,
      `https://i.pravatar.cc/900?u=${encodeURIComponent(seed)}`,
    ];

    for (const url of sources) {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(25_000),
          redirect: 'follow',
          headers: { 'User-Agent': 'AcompanhanteRestore/1.0' },
        });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 8_000) continue;
        return buf;
      } catch {
        /* try next */
      }
    }

    throw new Error('Não foi possível baixar retrato');
  }
}
