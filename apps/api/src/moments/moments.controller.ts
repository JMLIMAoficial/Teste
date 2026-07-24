import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { assertRateLimit } from '../common/rate-limit.util';
import { MomentsService } from './moments.service';
import { CurrentUser, JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/auth.types';
import type { AuthUser } from '../common/auth.types';

class UploadMomentDto {
  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  mediaType?: 'photo' | 'video';
}

@Controller('v1')
export class MomentsController {
  constructor(private readonly momentsService: MomentsService) {}

  @Get('moments/feed')
  feed(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.momentsService.getFeed(
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('profiles/:slug/moments')
  byProfile(@Param('slug') slug: string) {
    return this.momentsService.listByProfileSlug(slug);
  }

  @Post('moments/:id/view')
  trackView(
    @Param('id') id: string,
    @Body('sessionId') sessionId: string | undefined,
    @Req() req: Request,
  ) {
    assertRateLimit(`moment-view:${req.ip ?? 'unknown'}`, 60, 60 * 1000);
    return this.momentsService.trackView(id, sessionId);
  }

  @Get('companion/moments/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('companion')
  ownStats(@CurrentUser() user: AuthUser) {
    return this.momentsService.getOwnStats(user.id);
  }

  @Get('companion/moments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('companion')
  own(@CurrentUser() user: AuthUser) {
    return this.momentsService.listOwn(user.id);
  }

  @Post('companion/moments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('companion')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 30 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMomentDto,
  ) {
    return this.momentsService.uploadForUser(user.id, file, dto.caption, dto.mediaType);
  }
}
