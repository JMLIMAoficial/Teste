import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { MediaRestoreService } from '../storage/media-restore.service';

/**
 * One-shot restore for missing local/volume media files.
 * Protected by MEDIA_RESTORE_KEY (set only while restoring).
 */
@Controller('v1/internal')
export class MediaRestoreController {
  constructor(private readonly mediaRestore: MediaRestoreService) {}

  @Post('restore-missing-media')
  restore(@Headers('x-restore-key') key?: string) {
    const expected = process.env.MEDIA_RESTORE_KEY;
    if (!expected || !key || key !== expected) {
      throw new UnauthorizedException('Restore key inválida');
    }
    return this.mediaRestore.restoreMissingPhotos();
  }
}
