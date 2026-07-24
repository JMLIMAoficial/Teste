import { BadRequestException, Injectable } from '@nestjs/common';
import { LikeTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async toggle(input: {
    targetType: LikeTargetType;
    targetId: string;
    visitorId: string;
  }) {
    if (!input.visitorId) {
      throw new BadRequestException('visitorId obrigatório');
    }

    const profileId = await this.resolveProfileId(input.targetType, input.targetId);
    if (!profileId) throw new BadRequestException('Conteúdo não encontrado');

    const existing = await this.prisma.like.findUnique({
      where: {
        targetType_targetId_visitorId: {
          targetType: input.targetType,
          targetId: input.targetId,
          visitorId: input.visitorId,
        },
      },
    });

    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      await this.decrementCount(input.targetType, input.targetId);
      await this.analytics.recalculateHotScore(profileId);
      return { liked: false };
    }

    await this.prisma.like.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        profileId,
        visitorId: input.visitorId,
      },
    });

    await this.incrementCount(input.targetType, input.targetId);
    await this.analytics.recalculateHotScore(profileId);

    return { liked: true };
  }

  private async incrementCount(targetType: LikeTargetType, targetId: string) {
    if (targetType === 'moment') {
      await this.prisma.moment.update({
        where: { id: targetId },
        data: { likeCount: { increment: 1 } },
      });
    } else {
      await this.prisma.video.update({
        where: { id: targetId },
        data: { likeCount: { increment: 1 } },
      });
    }
  }

  private async decrementCount(targetType: LikeTargetType, targetId: string) {
    if (targetType === 'moment') {
      await this.prisma.moment.update({
        where: { id: targetId },
        data: { likeCount: { decrement: 1 } },
      });
    } else {
      await this.prisma.video.update({
        where: { id: targetId },
        data: { likeCount: { decrement: 1 } },
      });
    }
  }

  private async resolveProfileId(targetType: LikeTargetType, targetId: string) {
    if (targetType === 'moment') {
      const m = await this.prisma.moment.findFirst({
        where: { id: targetId, status: 'approved' },
      });
      return m?.profileId ?? null;
    }
    const v = await this.prisma.video.findFirst({
      where: { id: targetId, status: 'approved' },
    });
    return v?.profileId ?? null;
  }
}
