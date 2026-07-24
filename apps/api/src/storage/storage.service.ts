import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { mediumStoragePath, thumbStoragePath } from './image-variants.service';

export type PhotoUrls = {
  coverPhotoUrl: string;
  coverPhotoThumbUrl: string;
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client | null = null;
  private useS3 = false;
  private bucket = 'acompanhante-media';
  private uploadDir: string;
  private publicBase: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir =
      this.config.get('UPLOAD_DIR') ?? join(process.cwd(), '../../uploads');
    this.publicBase = this.config.get(
      'S3_PUBLIC_URL',
      'http://localhost:4000/api/v1/media',
    );
    this.bucket = this.config.get('S3_BUCKET', 'acompanhante-media');
  }

  async onModuleInit() {
    const endpoint = this.config.get('S3_ENDPOINT');
    if (!endpoint) return;

    try {
      this.s3 = new S3Client({
        endpoint,
        region: this.config.get('S3_REGION', 'us-east-1'),
        credentials: {
          accessKeyId: this.config.get('S3_ACCESS_KEY', 'minioadmin'),
          secretAccessKey: this.config.get('S3_SECRET_KEY', 'minioadmin'),
        },
        forcePathStyle: true,
      });
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.useS3 = true;
      this.logger.log(`S3/MinIO connected (bucket: ${this.bucket})`);
    } catch (err) {
      this.logger.warn(`S3 unavailable, using local storage: ${err}`);
      this.s3 = null;
      this.useS3 = false;
    }
  }

  getPublicUrl(storagePath: string): string {
    const base = this.publicBase.replace(/\/$/, '');
    return `${base}/${storagePath}`;
  }

  async exists(storagePath: string): Promise<boolean> {
    if (this.useS3 && this.s3) {
      try {
        await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: storagePath }));
        return true;
      } catch {
        return false;
      }
    }

    return existsSync(join(this.uploadDir, storagePath));
  }

  async resolvePhotoUrls(storagePath: string): Promise<PhotoUrls> {
    const originalUrl = this.getPublicUrl(storagePath);
    const thumbPath = thumbStoragePath(storagePath);
    const mediumPath = mediumStoragePath(storagePath);

    const [hasThumb, hasMedium] = await Promise.all([
      this.exists(thumbPath),
      this.exists(mediumPath),
    ]);

    return {
      coverPhotoUrl: hasMedium ? this.getPublicUrl(mediumPath) : originalUrl,
      coverPhotoThumbUrl: hasThumb ? this.getPublicUrl(thumbPath) : originalUrl,
    };
  }

  isUsingS3(): boolean {
    return this.useS3;
  }

  async upload(storagePath: string, buffer: Buffer, contentType: string) {
    if (this.useS3 && this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storagePath,
          Body: buffer,
          ContentType: contentType,
        }),
      );
      return;
    }

    const fullPath = join(this.uploadDir, storagePath);
    const dir = join(fullPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const { writeFile } = await import('fs/promises');
    await writeFile(fullPath, buffer);
  }

  async getObject(storagePath: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (this.useS3 && this.s3) {
      try {
        const res = await this.s3.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: storagePath }),
        );
        const bytes = await res.Body?.transformToByteArray();
        if (!bytes) return null;
        return {
          buffer: Buffer.from(bytes),
          contentType: res.ContentType ?? 'application/octet-stream',
        };
      } catch {
        return null;
      }
    }

    const fullPath = join(this.uploadDir, storagePath);
    if (!existsSync(fullPath)) return null;
    const { readFile } = await import('fs/promises');
    const buffer = await readFile(fullPath);
    const ext = storagePath.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      mp4: 'video/mp4',
      webm: 'video/webm',
    };
    return { buffer, contentType: mimeMap[ext ?? ''] ?? 'application/octet-stream' };
  }
}
