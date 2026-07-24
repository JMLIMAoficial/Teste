import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { CommentTargetType } from '@prisma/client';
import { assertRateLimit } from '../common/rate-limit.util';
import { CommentsService } from './comments.service';

class CreateCommentDto {
  @IsEnum(CommentTargetType)
  targetType!: CommentTargetType;

  @IsUUID()
  targetId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  authorName?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  content!: string;
}

@Controller('v1/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(@Body() dto: CreateCommentDto, @Req() req: Request) {
    assertRateLimit(`comment:${req.ip ?? 'unknown'}`, 10, 60 * 60 * 1000);
    return this.commentsService.create(dto);
  }

  @Get(':targetType/:targetId')
  list(
    @Param('targetType') targetType: CommentTargetType,
    @Param('targetId') targetId: string,
  ) {
    return this.commentsService.listApproved(targetType, targetId);
  }
}
