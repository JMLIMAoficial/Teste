import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ReportsService } from './reports.service';
import { CreateReportDto, ResolveReportDto } from './reports.dto';
import { assertRateLimit } from '../common/rate-limit.util';
import { CurrentUser, JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions, Roles, AuthUser } from '../common/auth.types';
import { PERMISSIONS } from '../common/permissions';

@Controller('v1')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('reports')
  create(@Body() dto: CreateReportDto, @Req() req: Request) {
    assertRateLimit(`report:${req.ip ?? 'unknown'}`, 5, 60 * 60 * 1000);
    return this.reportsService.create(dto, req.ip);
  }

  @Get('admin/reports/pending')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'moderator')
  @Permissions(PERMISSIONS.REPORTS_MANAGE)
  listPending() {
    return this.reportsService.listPending();
  }

  @Patch('admin/reports/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'moderator')
  @Permissions(PERMISSIONS.REPORTS_MANAGE)
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reportsService.resolve(id, user, dto);
  }

  @Patch('admin/reports/:id/dismiss')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'moderator')
  @Permissions(PERMISSIONS.REPORTS_MANAGE)
  dismiss(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reportsService.dismiss(id, user, dto);
  }
}
