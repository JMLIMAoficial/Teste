import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
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

class BoostRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class RejectBoostDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

class ApproveBoostDto {
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

  @Get('boost-requests/pending')
  listPending() {
    return this.premium.listPendingRequests();
  }

  @Patch('boost-requests/:id/approve')
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveBoostDto,
  ) {
    return this.premium.approveRequest(id, user, dto.expiresAt, dto.note);
  }

  @Patch('boost-requests/:id/reject')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectBoostDto,
  ) {
    return this.premium.rejectRequest(id, user, dto.reason);
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

  @Post('status/premium')
  requestPremium(@CurrentUser() user: AuthUser, @Body() dto: BoostRequestDto) {
    return this.premium.requestBoost(user.id, 'premium', dto.note);
  }

  @Post('status/featured')
  requestFeatured(@CurrentUser() user: AuthUser, @Body() dto: BoostRequestDto) {
    return this.premium.requestBoost(user.id, 'featured', dto.note);
  }
}
