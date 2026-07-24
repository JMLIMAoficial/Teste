import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SearchService } from '../search/search.service';

type HealthStatus = 'healthy' | 'degraded' | 'down';

interface HealthCheck {
  service: string;
  status: HealthStatus;
  latencyMs?: number;
  error?: string;
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly search: SearchService,
  ) {}

  @Get()
  async check() {
    const checks: HealthCheck[] = [];
    const start = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.push({
        service: 'postgresql',
        status: 'healthy',
        latencyMs: Date.now() - start,
      });
    } catch (error) {
      checks.push({
        service: 'postgresql',
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    checks.push(await this.checkRedis());
    checks.push(await this.search.checkHealth());

    const postgresDown = checks.some((c) => c.service === 'postgresql' && c.status === 'down');
    const hasDegraded = checks.some((c) => c.status === 'degraded');
    const status: HealthStatus = postgresDown ? 'down' : hasDegraded ? 'degraded' : 'healthy';

    return {
      status,
      version: process.env.npm_package_version ?? '0.1.0',
      uptime: process.uptime(),
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkRedis(): Promise<HealthCheck> {
    const start = Date.now();
    const client = this.redis.getClient();

    if (!client) {
      return { service: 'redis', status: 'degraded', error: 'Not configured' };
    }

    if (!this.redis.isAvailable()) {
      return { service: 'redis', status: 'degraded', error: 'Not connected' };
    }

    try {
      await Promise.race([
        client.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Redis ping timeout')), 2_000),
        ),
      ]);
      return { service: 'redis', status: 'healthy', latencyMs: Date.now() - start };
    } catch (error) {
      return {
        service: 'redis',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
