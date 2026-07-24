import { Global, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get('REDIS_URL');
    if (!url) return;

    try {
      this.client = new Redis(url, { maxRetriesPerRequest: null });
      this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
      this.logger.log('Redis connected');
    } catch (err) {
      this.logger.warn(`Redis unavailable: ${err}`);
      this.client = null;
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isAvailable(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }
}
