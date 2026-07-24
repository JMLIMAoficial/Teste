import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CompanionService } from './companion.service';
import { UpdateProfileDto, UpdatePricingDto, UpdateAvailabilityDto } from './companion.dto';
import { CurrentUser, JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/auth.types';
import type { AuthUser } from '../common/auth.types';

@Controller('v1/companion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('companion')
export class CompanionController {
  constructor(private readonly companionService: CompanionService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.companionService.getOwnProfile(user.id);
  }

  @Get('profile/preview')
  getProfilePreview(@CurrentUser() user: AuthUser) {
    return this.companionService.getPublicPreview(user.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.companionService.updateOwnProfile(user.id, dto);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.companionService.getDashboard(user.id);
  }

  @Get('pricing')
  getPricing(@CurrentUser() user: AuthUser) {
    return this.companionService.getPricing(user.id);
  }

  @Patch('pricing')
  updatePricing(@CurrentUser() user: AuthUser, @Body() dto: UpdatePricingDto) {
    return this.companionService.updatePricing(user.id, dto);
  }

  @Get('availability')
  getAvailability(@CurrentUser() user: AuthUser) {
    return this.companionService.getAvailability(user.id);
  }

  @Patch('availability')
  updateAvailability(@CurrentUser() user: AuthUser, @Body() dto: UpdateAvailabilityDto) {
    return this.companionService.updateAvailability(user.id, dto);
  }
}
