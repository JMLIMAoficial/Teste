import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { IsEnum, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { LikeTargetType } from '@prisma/client';
import { assertRateLimit } from '../common/rate-limit.util';
import { LikesService } from './likes.service';

class ToggleLikeDto {
  @IsEnum(LikeTargetType)
  targetType!: LikeTargetType;

  @IsUUID()
  targetId!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  visitorId!: string;
}

@Controller('v1/likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post('toggle')
  toggle(@Body() dto: ToggleLikeDto, @Req() req: Request) {
    assertRateLimit(`like:${req.ip ?? 'unknown'}`, 60, 60 * 60 * 1000);
    return this.likesService.toggle(dto);
  }
}
