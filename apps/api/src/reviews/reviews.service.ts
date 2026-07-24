import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { DomainEvents } from '../events/domain-events';
import { createHash } from 'crypto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly events: EventEmitter2,
  ) {}

  async create(input: {
    profileId: string;
    authorName: string;
    rating: number;
    comment?: string;
    fingerprint?: string;
  }) {
    if (input.rating < 1 || input.rating > 5) {
      throw new BadRequestException('Avaliação deve ser entre 1 e 5');
    }

    const profile = await this.prisma.profile.findFirst({
      where: { id: input.profileId, status: 'approved', isPublic: true },
    });
    if (!profile) throw new BadRequestException('Perfil não encontrado');

    const fingerprint =
      input.fingerprint ??
      createHash('sha256').update(`${input.authorName}:${input.profileId}`).digest('hex');

    const existing = await this.prisma.review.findFirst({
      where: { profileId: input.profileId, authorFingerprint: fingerprint, status: { not: 'rejected' } },
    });
    if (existing) {
      throw new BadRequestException('Você já avaliou este perfil');
    }

    const review = await this.prisma.review.create({
      data: {
        profileId: input.profileId,
        authorName: input.authorName.trim().slice(0, 100),
        authorFingerprint: fingerprint,
        rating: input.rating,
        comment: input.comment?.trim().slice(0, 500),
        status: 'pending',
      },
    });

    this.events.emit(DomainEvents.ReviewCreated, {
      reviewId: review.id,
      profileId: input.profileId,
      authorName: review.authorName,
      rating: input.rating,
    });

    return { id: review.id, status: review.status, message: 'Avaliação enviada para moderação' };
  }

  async listByProfile(profileId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { profileId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const summary = await this.prisma.reviewSummary.findUnique({ where: { profileId } });

    return {
      data: reviews.map((r) => ({
        id: r.id,
        authorName: r.authorName,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
      summary: summary
        ? {
            averageRating: Number(summary.averageRating),
            reviewCount: summary.reviewCount,
            distribution: summary.distribution,
          }
        : null,
    };
  }

  async listBySlug(slug: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { slug, status: 'approved', isPublic: true },
    });
    if (!profile) return { data: [], summary: null };
    return this.listByProfile(profile.id);
  }

  async listPending() {
    const reviews = await this.prisma.review.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    return { data: reviews, total: reviews.length };
  }

  async approve(id: string) {
    const review = await this.prisma.review.update({
      where: { id },
      data: { status: 'approved' },
    });
    await this.updateSummary(review.profileId);
    await this.analytics.recalculateHotScore(review.profileId);
    return { id: review.id, status: review.status };
  }

  async reject(id: string) {
    const review = await this.prisma.review.update({
      where: { id },
      data: { status: 'rejected' },
    });
    return { id: review.id, status: review.status };
  }

  private async updateSummary(profileId: string) {
    const approved = await this.prisma.review.findMany({
      where: { profileId, status: 'approved' },
    });

    if (!approved.length) return;

    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let sum = 0;
    for (const r of approved) {
      sum += r.rating;
      distribution[String(r.rating)] = (distribution[String(r.rating)] ?? 0) + 1;
    }

    const average = Math.round((sum / approved.length) * 100) / 100;

    await this.prisma.reviewSummary.upsert({
      where: { profileId },
      create: {
        profileId,
        averageRating: average,
        reviewCount: approved.length,
        distribution: distribution as Prisma.InputJsonValue,
      },
      update: {
        averageRating: average,
        reviewCount: approved.length,
        distribution: distribution as Prisma.InputJsonValue,
      },
    });
  }
}
