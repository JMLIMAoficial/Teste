import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { SettingsService } from '../platform/settings.service';
import { computeHotScore, hotScoreLevel, effectiveProfileStatus } from '../common/profile.mapper';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly settings: SettingsService,
  ) {}

  async track(
    eventType: string,
    data: { profileId?: string; sessionId?: string; metadata?: Record<string, unknown> },
  ) {
    await this.prisma.analyticsEvent.create({
      data: {
        eventType,
        profileId: data.profileId,
        sessionId: data.sessionId,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    if (eventType === 'ProfileViewed' && data.profileId) {
      await this.onProfileViewed(data.profileId);
    }

    if (eventType === 'MomentViewed' && data.metadata?.momentId) {
      await this.onMomentViewed(String(data.metadata.momentId));
    }

    if (eventType === 'WhatsAppClicked' && data.profileId) {
      await this.recalculateHotScore(data.profileId);
    }

    return { tracked: true };
  }

  private async onProfileViewed(profileId: string) {
    await this.prisma.profile.update({
      where: { id: profileId },
      data: { viewCount: { increment: 1 } },
    });
    await this.recalculateHotScore(profileId);
  }

  private async onMomentViewed(momentId: string) {
    const moment = await this.prisma.moment.findFirst({
      where: { id: momentId, status: 'approved', deletedAt: null },
    });
    if (!moment) return;

    await this.prisma.moment.update({
      where: { id: momentId },
      data: { viewCount: { increment: 1 } },
    });
    await this.recalculateHotScore(moment.profileId);
  }

  async recalculateHotScore(profileId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) return;

    const [whatsappClicks, approvedComments, approvedReviews, momentStats, videoStats] =
      await Promise.all([
        this.prisma.analyticsEvent.count({
          where: { profileId, eventType: 'WhatsAppClicked' },
        }),
        this.prisma.comment.count({ where: { profileId, status: 'approved' } }),
        this.prisma.review.count({ where: { profileId, status: 'approved' } }),
        this.prisma.moment.aggregate({
          where: { profileId, status: 'approved' },
          _sum: { likeCount: true, viewCount: true },
        }),
        this.prisma.video.aggregate({
          where: { profileId, status: 'approved' },
          _sum: { viewCount: true, likeCount: true },
        }),
      ]);

    const effective = effectiveProfileStatus(profile);
    const weights = await this.settings.getHotScoreWeights();

    let score = computeHotScore({
      viewCount: profile.viewCount,
      isPremium: effective.isPremium,
      isFeatured: effective.isFeatured,
      whatsappClicks,
      premiumBonus: weights.premiumBonus,
      featuredBonus: weights.featuredBonus,
    });

    score += Math.min(8, approvedComments * 2);
    score += Math.min(12, approvedReviews * 3);
    score += Math.min(8, (momentStats._sum.likeCount ?? 0) * 0.5);
    score += Math.min(6, (videoStats._sum.viewCount ?? 0) * 0.2);
    score = Math.min(100, Math.round(score * 100) / 100);

    const level = hotScoreLevel(score);

    await this.prisma.hotScore.upsert({
      where: { profileId },
      create: { profileId, score, level },
      update: { score, level },
    });

    await this.search.indexProfile(profileId);
  }
}
