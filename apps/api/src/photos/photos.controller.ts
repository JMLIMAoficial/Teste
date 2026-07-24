import {

  Body,

  Controller,

  Delete,

  Param,

  Patch,

  Post,

  UploadedFile,

  UseGuards,

  UseInterceptors,

} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { memoryStorage } from 'multer';

import { PhotosService } from './photos.service';

import { ReorderPhotosDto } from './photos.dto';

import { CurrentUser, JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { Roles } from '../common/auth.types';

import type { AuthUser } from '../common/auth.types';



@Controller('v1/companion/photos')

@UseGuards(JwtAuthGuard, RolesGuard)

@Roles('companion')

export class PhotosController {

  constructor(private readonly photosService: PhotosService) {}



  @Post()

  @UseInterceptors(

    FileInterceptor('file', {

      storage: memoryStorage(),

      limits: { fileSize: 10 * 1024 * 1024 },

    }),

  )

  upload(

    @CurrentUser() user: AuthUser,

    @UploadedFile() file: Express.Multer.File,

  ) {

    return this.photosService.uploadForUser(user.id, file);

  }



  @Patch('reorder')

  reorder(@CurrentUser() user: AuthUser, @Body() dto: ReorderPhotosDto) {

    return this.photosService.reorderPhotos(user.id, dto.photoIds);

  }



  @Patch(':id/cover')

  setCover(@CurrentUser() user: AuthUser, @Param('id') id: string) {

    return this.photosService.setCover(user.id, id);

  }



  @Delete(':id')

  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {

    return this.photosService.deletePhoto(user.id, id);

  }

}


