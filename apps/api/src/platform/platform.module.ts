import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditService } from './audit.service';
import { PlatformController } from './platform.controller';
import { SettingsService } from './settings.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [PlatformController],
  providers: [AuditService, SettingsService],
  exports: [AuditService, SettingsService],
})
export class PlatformModule {}
