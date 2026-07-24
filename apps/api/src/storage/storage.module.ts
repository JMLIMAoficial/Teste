import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ImageVariantsService } from './image-variants.service';

@Global()
@Module({
  providers: [StorageService, ImageVariantsService],
  exports: [StorageService, ImageVariantsService],
})
export class StorageModule {}
