import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Permissions, Roles, AuthUser } from '../common/auth.types';
import { CurrentUser, JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PERMISSIONS } from '../common/permissions';import { AuditService } from './audit.service';
import { SettingsService } from './settings.service';

class SettingUpdateDto {
  @IsString()
  key!: string;

  @IsString()
  value!: string;
}

class UpdateSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingUpdateDto)
  settings!: SettingUpdateDto[];
}

@Controller('v1')
export class PlatformController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get('settings')
  getPublicSettings() {
    return this.settings.getPublic();
  }

  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  getAdminSettings() {
    return this.settings.getAll();
  }

  @Patch('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async updateSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateSettingsDto) {    const result = await this.settings.updateMany(dto.settings, user.id);
    await this.audit.log({
      actorId: user.id,
      actorEmail: user.email,
      action: 'settings.updated',
      entityType: 'settings',
      metadata: { keys: result.updated.map((u) => u.key) },
    });
    return result;
  }

  @Get('admin/audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listAuditLogs(@Query('limit') limit?: string, @Query('action') action?: string) {
    return this.audit.list({
      limit: limit ? parseInt(limit, 10) : undefined,
      action,
    });
  }
}
