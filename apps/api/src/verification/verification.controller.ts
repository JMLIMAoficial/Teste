import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { VerificationService } from './verification.service';
import { CreateVerificationRequestDto } from '../companion/companion.dto';
import { CurrentUser, JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/auth.types';
import type { AuthUser } from '../common/auth.types';

class RejectVerificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@Controller('v1')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('companion/verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('companion')
  companionStatus(@CurrentUser() user: AuthUser) {
    return this.verificationService.getCompanionStatus(user.id);
  }

  @Post('companion/verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('companion')
  createRequest(@CurrentUser() user: AuthUser, @Body() dto: CreateVerificationRequestDto) {
    return this.verificationService.createRequest(user.id, dto.note);
  }

  @Get('admin/verification/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listPending() {
    return this.verificationService.listPending();
  }

  @Patch('admin/verification/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.verificationService.approve(id, user);
  }

  @Patch('admin/verification/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectVerificationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.verificationService.reject(id, dto.reason, user);
  }
}
