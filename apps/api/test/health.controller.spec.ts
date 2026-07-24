import { Test } from '@nestjs/testing';
import { HealthController } from '../src/health/health.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { SearchService } from '../src/search/search.service';

describe('HealthController', () => {
  let controller: HealthController;

  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  const redis = {
    getClient: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue('PONG'),
    }),
    isAvailable: jest.fn().mockReturnValue(true),
  };

  const search = {
    checkHealth: jest.fn().mockResolvedValue({
      service: 'meilisearch',
      status: 'degraded',
      error: 'Not configured',
    }),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: SearchService, useValue: search },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('returns healthy when postgres is up and optional deps are degraded', async () => {
    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ service: 'postgresql', status: 'healthy' }),
        expect.objectContaining({ service: 'redis', status: 'healthy' }),
        expect.objectContaining({ service: 'meilisearch', status: 'degraded' }),
      ]),
    );
  });

  it('returns down when postgres fails', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));

    const result = await controller.check();

    expect(result.status).toBe('down');
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ service: 'postgresql', status: 'down' }),
      ]),
    );
  });
});
