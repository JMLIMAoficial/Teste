import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { MessagingService } from './messaging.service';
import { CurrentUser, JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/auth.types';
import type { AuthUser } from '../common/auth.types';

class CreateConversationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  subject!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  body!: string;
}

class ReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}

@Controller('v1')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get('companion/conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('companion')
  listCompanion(@CurrentUser() user: AuthUser) {
    return this.messaging.listForCompanion(user.id);
  }

  @Post('companion/conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('companion')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    return this.messaging.createConversation(user.id, dto.subject, dto.body);
  }

  @Get('companion/conversations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('companion')
  getCompanion(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.messaging.getForCompanion(user.id, id);
  }

  @Post('companion/conversations/:id/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('companion')
  replyCompanion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReplyDto,
  ) {
    return this.messaging.replyAsCompanion(user.id, id, dto.body);
  }

  @Get('admin/conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  listAdmin(@Query('status') status?: string) {
    return this.messaging.listForAdmin(status);
  }

  @Get('admin/conversations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  getAdmin(@Param('id') id: string) {
    return this.messaging.getForAdmin(id);
  }

  @Post('admin/conversations/:id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  replyAdmin(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReplyDto) {
    return this.messaging.replyAsAdmin(user, id, dto.body);
  }

  @Patch('admin/conversations/:id/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  close(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.messaging.closeConversation(user, id);
  }
}
