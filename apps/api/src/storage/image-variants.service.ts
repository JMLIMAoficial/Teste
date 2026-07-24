import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

export const THUMB_WIDTH = 480;
export const MEDIUM_WIDTH = 1200;

export function thumbStoragePath(storagePath: string): string {
  const dot = storagePath.lastIndexOf('.');
  const base = dot >= 0 ? storagePath.slice(0, dot) : storagePath;
  return `${base}_thumb.webp`;
}

export function mediumStoragePath(storagePath: string): string {
  const dot = storagePath.lastIndexOf('.');
  const base = dot >= 0 ? storagePath.slice(0, dot) : storagePath;
  return `${base}_md.webp`;
}

@Injectable()
export class ImageVariantsService {
  async generateVariants(buffer: Buffer): Promise<{ thumb: Buffer; medium: Buffer }> {
    const thumb = await sharp(buffer)
      .rotate()
      .resize(THUMB_WIDTH, undefined, { withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer();

    const medium = await sharp(buffer)
      .rotate()
      .resize(MEDIUM_WIDTH, undefined, { withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: 85 })
      .toBuffer();

    return { thumb, medium };
  }
}
