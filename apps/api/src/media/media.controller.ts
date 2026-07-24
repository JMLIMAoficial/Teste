import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from '../storage/storage.service';

@Controller('v1/media')
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  @Get('*path')
  async serve(@Param('path') pathParts: string[], @Res() res: Response) {
    const storagePath = pathParts.join('/');
    const obj = await this.storage.getObject(storagePath);
    if (!obj) {
      throw new NotFoundException('Arquivo não encontrado');
    }
    res.setHeader('Content-Type', obj.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(obj.buffer);
  }
}
