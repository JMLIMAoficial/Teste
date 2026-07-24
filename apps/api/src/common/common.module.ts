import { Global, Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CoverPhotoService } from './cover-photo.service';
import { GeocodingService } from './geocoding.service';

@Global()
@Module({
  providers: [ContactService, CoverPhotoService, GeocodingService],
  exports: [ContactService, CoverPhotoService, GeocodingService],
})
export class CommonModule {}
