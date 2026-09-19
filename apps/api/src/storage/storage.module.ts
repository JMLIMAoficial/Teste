import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ImageVariantsService } from './image-variants.service';
import { MediaRestoreService } from './media-restore.service';
import { MediaRestoreController } from './media-restore.controller';

@Global()
@Module({
  controllers: [MediaRestoreController],
  providers: [StorageService, ImageVariantsService, MediaRestoreService],
  exports: [StorageService, ImageVariantsService, MediaRestoreService],
})
export class StorageModule {}
