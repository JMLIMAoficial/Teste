import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CommentTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { DomainEvents } from '../events/domain-events';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly events: EventEmitter2,
  ) {}

  async create(input: {
    targetType: CommentTargetType;
    targetId: string;
    authorName?: string;
    content: string;
  }) {
    if (!input.content.trim()) {
      throw new BadRequestException('Comentário é obrigatório');
    }
    if (input.content.length > 500) {
      throw new BadRequestException('Comentário muito longo (máx. 500 caracteres)');
    }

    const instantPublish = input.targetType === 'moment';
    const authorName = input.authorName?.trim()
      ? input.authorName.trim().slice(0, 100)
      : instantPublish
        ? 'Anônimo'
        : '';

    if (!instantPublish && !authorName) {
      throw new BadRequestException('Nome e comentário são obrigatórios');
    }

    const profileId = await this.resolveProfileId(input.targetType, input.targetId);
    if (!profileId) throw new BadRequestException('Alvo não encontrado');

    const comment = await this.prisma.comment.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        profileId,
        authorName,
        content: input.content.trim().slice(0, 500),
        status: instantPublish ? 'approved' : 'pending',
      },
    });

    if (instantPublish) {
      await this.prisma.moment.update({
        where: { id: input.targetId },
        data: { commentCount: { increment: 1 } },
      });
      await this.analytics.recalculateHotScore(profileId);
    }

    this.events.emit(DomainEvents.CommentCreated, {
      commentId: comment.id,
      profileId,
      authorName: comment.authorName,
      targetType: input.targetType,
    });

    if (instantPublish) {
      return {
        id: comment.id,
        status: comment.status,
        message: 'Comentário publicado.',
        data: {
          id: comment.id,
          authorName: comment.authorName,
          content: comment.content,
          createdAt: comment.createdAt,
        },
      };
    }

    return { id: comment.id, status: comment.status, message: 'Comentário enviado para moderação' };
  }

  async listApproved(targetType: CommentTargetType, targetId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { targetType, targetId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      data: comments.map((c) => ({
        id: c.id,
        authorName: c.authorName,
        content: c.content,
        createdAt: c.createdAt,
      })),
    };
  }

  async listPending() {
    const comments = await this.prisma.comment.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    return { data: comments, total: comments.length };
  }

  async approve(id: string) {
    const comment = await this.prisma.comment.update({
      where: { id },
      data: { status: 'approved' },
    });

    if (comment.targetType === 'moment') {
      await this.prisma.moment.update({
        where: { id: comment.targetId },
        data: { commentCount: { increment: 1 } },
      });
    } else if (comment.targetType === 'video') {
      await this.prisma.video.update({
        where: { id: comment.targetId },
        data: { commentCount: { increment: 1 } },
      });
    }

    await this.analytics.recalculateHotScore(comment.profileId);
    return { id: comment.id, status: comment.status };
  }

  async reject(id: string) {
    const comment = await this.prisma.comment.update({
      where: { id },
      data: { status: 'rejected' },
    });
    return { id: comment.id, status: comment.status };
  }

  private async resolveProfileId(targetType: CommentTargetType, targetId: string) {
    if (targetType === 'profile') {
      const p = await this.prisma.profile.findFirst({
        where: { id: targetId, status: 'approved', isPublic: true },
      });
      return p?.id ?? null;
    }
    if (targetType === 'moment') {
      const m = await this.prisma.moment.findFirst({
        where: { id: targetId, status: 'approved' },
      });
      return m?.profileId ?? null;
    }
    if (targetType === 'video') {
      const v = await this.prisma.video.findFirst({
        where: { id: targetId, status: 'approved' },
      });
      return v?.profileId ?? null;
    }
    return null;
  }
}
