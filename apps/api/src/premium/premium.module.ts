import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';
import { CompanionStatusController, PremiumController } from './premium.controller';
import { PremiumService } from './premium.service';

@Module({
  imports: [AuthModule, AnalyticsModule, SearchModule],
  controllers: [PremiumController, CompanionStatusController],
  providers: [PremiumService],
  exports: [PremiumService],
})
export class PremiumModule {}
