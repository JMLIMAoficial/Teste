import { Controller, Get, Query } from '@nestjs/common';
import { RankingsService } from './rankings.service';

@Controller('v1/rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  get(
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rankingsService.getRankings(
      type ?? 'hotscore',
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
