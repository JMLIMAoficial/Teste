import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AdminService } from './admin.service';
import { AdminApproveDto, AdminListProfilesQueryDto, AdminUpdateProfileDto } from './admin.dto';
import { JwtAuthGuard, CurrentUser } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions, Roles, AuthUser } from '../common/auth.types';
import { PERMISSIONS } from '../common/permissions';

class RejectDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class BlockProfileDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class BatchModerationDto {
  @IsEnum(['comments', 'reviews', 'moments', 'videos'])
  type!: 'comments' | 'reviews' | 'moments' | 'videos';

  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];

  @IsEnum(['approve', 'reject'])
  action!: 'approve' | 'reject';
}

@Controller('v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'moderator')
@Permissions(PERMISSIONS.PROFILES_MODERATE)
export class AdminController {  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  stats() {
    return this.adminService.getStats();
  }

  @Get('profiles')
  listProfiles(@Query() query: AdminListProfilesQueryDto) {
    return this.adminService.listProfiles(query);
  }

  @Get('profiles/pending')
  pendingProfiles() {
    return this.adminService.listPendingProfiles();
  }

  @Get('profiles/approved')
  approvedProfiles() {
    return this.adminService.listApprovedProfiles();
  }

  @Get('profiles/:id')
  getProfile(@Param('id') id: string) {
    return this.adminService.getProfileDetail(id);
  }

  @Patch('profiles/:id')
  updateProfile(
    @Param('id') id: string,
    @Body() dto: AdminUpdateProfileDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateProfile(id, dto, user);
  }

  @Patch('profiles/:id/verification')
  setProfileVerified(
    @Param('id') id: string,
    @Body('isVerified') isVerified: boolean,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.setProfileVerified(id, !!isVerified, user);
  }

  @Patch('profiles/:id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: AdminApproveDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.approveProfile(id, user, !!dto.force);
  }

  @Patch('profiles/:id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectDto, @CurrentUser() user: AuthUser) {
    return this.adminService.rejectProfile(id, dto.reason, user);
  }

  @Patch('profiles/:id/block')
  @Permissions(PERMISSIONS.USERS_BLOCK)
  block(@Param('id') id: string, @Body() dto: BlockProfileDto, @CurrentUser() user: AuthUser) {
    return this.adminService.blockProfile(id, dto.reason, user);
  }

  @Patch('profiles/:id/unblock')
  @Permissions(PERMISSIONS.USERS_BLOCK)
  unblock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminService.unblockProfile(id, user);
  }

  @Delete('profiles/:id')
  @Permissions(PERMISSIONS.USERS_BLOCK)
  deleteProfile(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminService.deleteProfile(id, user);
  }

  @Post('moderation/batch')
  batchModerate(@Body() dto: BatchModerationDto, @CurrentUser() user: AuthUser) {
    return this.adminService.batchModerate(dto.type, dto.ids, dto.action, user);
  }

  @Post('hot-scores/recalculate')
  @Permissions(PERMISSIONS.HOTSCORE_MANAGE)
  recalculateHotScores() {
    return this.adminService.recalculateAllHotScores();
  }

  @Get('comments/pending')
  pendingComments() {
    return this.adminService.listPendingComments();
  }

  @Patch('comments/:id/approve')
  approveComment(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminService.approveComment(id, user);
  }

  @Patch('comments/:id/reject')
  rejectComment(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminService.rejectComment(id, user);
  }

  @Get('reviews/pending')
  pendingReviews() {
    return this.adminService.listPendingReviews();
  }

  @Patch('reviews/:id/approve')
  approveReview(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminService.approveReview(id, user);
  }

  @Patch('reviews/:id/reject')
  rejectReview(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminService.rejectReview(id, user);
  }

  @Get('videos/pending')
  pendingVideos() {
    return this.adminService.listPendingVideos();
  }

  @Patch('videos/:id/approve')
  approveVideo(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminService.approveVideo(id, user);
  }

  @Patch('videos/:id/reject')
  rejectVideo(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminService.rejectVideo(id, user);
  }

  @Get('moments/pending')
  pendingMoments() {
    return this.adminService.listPendingMoments();
  }

  @Patch('moments/:id/approve')
  approveMoment(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminService.approveMoment(id, user);
  }

  @Patch('moments/:id/reject')
  rejectMoment(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminService.rejectMoment(id, user);
  }
}
