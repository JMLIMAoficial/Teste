import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { AuthUser, Roles } from '../common/auth.types';
import { CurrentUser, JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PremiumService } from './premium.service';

class StatusActionDto {
  @IsUUID()
  profileId!: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

@Controller('v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class PremiumController {
  constructor(private readonly premium: PremiumService) {}

  @Get('premium/profiles')
  search(@Query('q') q?: string) {
    return this.premium.searchProfiles(q);
  }

  @Post('premium/activate')
  activatePremium(@CurrentUser() user: AuthUser, @Body() dto: StatusActionDto) {
    return this.premium.activatePremium(dto.profileId, user, dto.expiresAt, dto.note);
  }

  @Post('premium/deactivate')
  deactivatePremium(@CurrentUser() user: AuthUser, @Body() dto: StatusActionDto) {
    return this.premium.deactivatePremium(dto.profileId, user, dto.note);
  }

  @Post('featured/activate')
  activateFeatured(@CurrentUser() user: AuthUser, @Body() dto: StatusActionDto) {
    return this.premium.activateFeatured(dto.profileId, user, dto.expiresAt, dto.note);
  }

  @Post('featured/deactivate')
  deactivateFeatured(@CurrentUser() user: AuthUser, @Body() dto: StatusActionDto) {
    return this.premium.deactivateFeatured(dto.profileId, user, dto.note);
  }
}

@Controller('v1/companion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('companion')
export class CompanionStatusController {
  constructor(private readonly premium: PremiumService) {}

  @Get('status')
  getStatus(@CurrentUser() user: AuthUser) {
    return this.premium.getCompanionStatus(user.id);
  }
}
