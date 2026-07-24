import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';

@Module({
  imports: [AnalyticsModule],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}
