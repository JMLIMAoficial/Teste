import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { assertRateLimit } from '../common/rate-limit.util';
import { AnalyticsService } from './analytics.service';

class TrackDto {
  @IsString()
  eventType!: string;

  @IsOptional()
  @IsUUID()
  profileId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  track(@Body() dto: TrackDto, @Req() req: Request) {
    assertRateLimit(`analytics:${req.ip ?? 'unknown'}`, 120, 60 * 1000);
    return this.analyticsService.track(dto.eventType, {
      profileId: dto.profileId,
      sessionId: dto.sessionId,
      metadata: dto.metadata,
    });
  }
}
