import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsOptional, IsString } from 'class-validator';
import { VideosService } from './videos.service';
import { CurrentUser, JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/auth.types';
import type { AuthUser } from '../common/auth.types';

class UploadVideoDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

@Controller('v1')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get('videos')
  gallery(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.videosService.listGallery(
      limit ? parseInt(limit, 10) : 24,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('videos/:id')
  getOne(@Param('id') id: string) {
    return this.videosService.getById(id);
  }

  @Get('profiles/:slug/videos')
  byProfile(@Param('slug') slug: string) {
    return this.videosService.listByProfileSlug(slug);
  }

  @Get('companion/videos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('companion')
  own(@CurrentUser() user: AuthUser) {
    return this.videosService.listOwn(user.id);
  }

  @Post('companion/videos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('companion')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadVideoDto,
  ) {
    return this.videosService.uploadForUser(user.id, file, dto);
  }
}
