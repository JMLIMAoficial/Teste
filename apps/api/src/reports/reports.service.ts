import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReportTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DomainEvents } from '../events/domain-events';
import type { AuthUser } from '../common/auth.types';
import { CreateReportDto, ResolveReportDto } from './reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async create(dto: CreateReportDto, reporterIp?: string) {
    await this.assertTargetExists(dto.targetType, dto.targetId);

    const report = await this.prisma.report.create({
      data: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        profileId: dto.profileId,
        reason: dto.reason,
        description: dto.description?.trim().slice(0, 500),
        reporterIp,
      },
    });

    this.events.emit(DomainEvents.ReportSubmitted, {
      reportId: report.id,
      targetType: dto.targetType,
      targetId: dto.targetId,
      profileId: dto.profileId,
      reason: dto.reason,
    });

    return { id: report.id, status: report.status, message: 'Denúncia registrada. Obrigado.' };
  }

  async listPending(limit = 50) {
    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
        take: limit,
      }),
      this.prisma.report.count({ where: { status: 'pending' } }),
    ]);

    const profileIds = [...new Set(data.map((r) => r.profileId).filter(Boolean))] as string[];
    const profiles =
      profileIds.length > 0
        ? await this.prisma.profile.findMany({
            where: { id: { in: profileIds } },
            select: { id: true, displayName: true, slug: true },
          })
        : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    return {
      data: data.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        profileId: r.profileId,
        profileName: r.profileId ? profileMap.get(r.profileId)?.displayName : null,
        profileSlug: r.profileId ? profileMap.get(r.profileId)?.slug : null,
        reason: r.reason,
        description: r.description,
        createdAt: r.createdAt,
      })),
      total,
    };
  }

  async resolve(id: string, actor: AuthUser, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report || report.status !== 'pending') {
      throw new NotFoundException('Denúncia não encontrada');
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status: 'resolved',
        resolution: dto.resolution?.trim().slice(0, 500) || 'Resolvida pela moderação',
        resolvedBy: actor.id,
        resolvedAt: new Date(),
      },
    });

    return { id: updated.id, status: updated.status };
  }

  async dismiss(id: string, actor: AuthUser, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report || report.status !== 'pending') {
      throw new NotFoundException('Denúncia não encontrada');
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status: 'dismissed',
        resolution: dto.resolution?.trim().slice(0, 500) || 'Denúncia arquivada',
        resolvedBy: actor.id,
        resolvedAt: new Date(),
      },
    });

    return { id: updated.id, status: updated.status };
  }

  private async assertTargetExists(targetType: ReportTargetType, targetId: string) {
    if (targetType === 'profile') {
      const profile = await this.prisma.profile.findFirst({
        where: { id: targetId, deletedAt: null },
      });
      if (!profile) throw new BadRequestException('Perfil não encontrado');
      return;
    }
    if (targetType === 'comment') {
      const comment = await this.prisma.comment.findUnique({ where: { id: targetId } });
      if (!comment) throw new BadRequestException('Comentário não encontrado');
      return;
    }
    if (targetType === 'moment') {
      const moment = await this.prisma.moment.findFirst({
        where: { id: targetId, deletedAt: null },
      });
      if (!moment) throw new BadRequestException('Momento não encontrado');
      return;
    }
    if (targetType === 'review') {
      const review = await this.prisma.review.findUnique({ where: { id: targetId } });
      if (!review) throw new BadRequestException('Avaliação não encontrada');
    }
  }
}
