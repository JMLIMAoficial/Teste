import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { SettingsService } from '../platform/settings.service';
import { computeHotScore, hotScoreLevel, effectiveProfileStatus } from '../common/profile.mapper';

/** Recalculate hot-score at most once per profile inside this window. */
const HOT_SCORE_DEBOUNCE_MS = 30_000;
/** Full hot-score recompute every N profile views (still increments every time). */
const HOT_SCORE_EVERY_N_VIEWS = 10;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly hotScoreTimers = new Map<string, NodeJS.Timeout>();

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
      this.scheduleHotScore(data.profileId);
    }

    return { tracked: true };
  }

  private async onProfileViewed(profileId: string) {
    const updated = await this.prisma.profile.update({
      where: { id: profileId },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });

    if (updated.viewCount % HOT_SCORE_EVERY_N_VIEWS === 0) {
      this.scheduleHotScore(profileId);
    }
  }

  private async onMomentViewed(momentId: string) {
    const moment = await this.prisma.moment.findFirst({
      where: { id: momentId, status: 'approved', deletedAt: null },
      select: { id: true, profileId: true },
    });
    if (!moment) return;

    await this.prisma.moment.update({
      where: { id: momentId },
      data: { viewCount: { increment: 1 } },
    });
    this.scheduleHotScore(moment.profileId);
  }

  /** Coalesce many view events into one hot-score recompute. */
  scheduleHotScore(profileId: string) {
    const existing = this.hotScoreTimers.get(profileId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.hotScoreTimers.delete(profileId);
      void this.recalculateHotScore(profileId).catch((err) => {
        this.logger.warn(`hot-score failed for ${profileId}: ${err}`);
      });
    }, HOT_SCORE_DEBOUNCE_MS);

    this.hotScoreTimers.set(profileId, timer);
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
