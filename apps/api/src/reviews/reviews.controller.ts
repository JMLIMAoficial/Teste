import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { assertRateLimit } from '../common/rate-limit.util';
import { ReviewsService } from './reviews.service';

class CreateReviewDto {
  @IsUUID()
  profileId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  authorName!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @IsOptional()
  @IsString()
  fingerprint?: string;
}

@Controller('v1/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(@Body() dto: CreateReviewDto, @Req() req: Request) {
    assertRateLimit(`review:${req.ip ?? 'unknown'}`, 5, 60 * 60 * 1000);
    return this.reviewsService.create(dto);
  }

  @Get('profile/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.reviewsService.listBySlug(slug);
  }
}
