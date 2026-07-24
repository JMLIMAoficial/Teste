import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { DomainEvents, type VerificationRequestPayload } from '../events/domain-events';
import type { AuthUser } from '../common/auth.types';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly search: SearchService,
  ) {}

  async getCompanionStatus(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        slug: true,
        displayName: true,
        status: true,
        isVerified: true,
      },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const latest = await this.prisma.verificationRequest.findFirst({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      isVerified: profile.isVerified,
      canRequest:
        profile.status === 'approved' &&
        !profile.isVerified &&
        (!latest || latest.status === 'rejected'),
      pendingRequest: latest?.status === 'pending' ? latest : null,
      lastRequest: latest,
    };
  }

  async createRequest(userId: string, note?: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');
    if (profile.status !== 'approved') {
      throw new BadRequestException('Perfil precisa estar aprovado para solicitar verificação');
    }
    if (profile.isVerified) {
      throw new BadRequestException('Perfil já verificado');
    }

    const pending = await this.prisma.verificationRequest.findFirst({
      where: { profileId: profile.id, status: 'pending' },
    });
    if (pending) {
      throw new BadRequestException('Já existe uma solicitação pendente');
    }

    const request = await this.prisma.verificationRequest.create({
      data: {
        profileId: profile.id,
        note: note?.trim().slice(0, 500) || null,
      },
    });

    const payload: VerificationRequestPayload = {
      requestId: request.id,
      profileId: profile.id,
      userId,
      displayName: profile.displayName,
      slug: profile.slug,
    };
    this.events.emit(DomainEvents.VerificationRequested, payload);

    return { id: request.id, status: request.status, message: 'Solicitação enviada para análise' };
  }

  async listPending() {
    const requests = await this.prisma.verificationRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });

    const profileIds = requests.map((r) => r.profileId);
    const profiles = await this.prisma.profile.findMany({
      where: { id: { in: profileIds } },
      include: { location: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    return {
      data: requests.map((r) => {
        const p = profileMap.get(r.profileId);
        return {
          id: r.id,
          profileId: r.profileId,
          note: r.note,
          createdAt: r.createdAt,
          displayName: p?.displayName ?? '—',
          slug: p?.slug ?? '',
          city: p?.location?.city,
          state: p?.location?.state,
          isVerified: p?.isVerified ?? false,
        };
      }),
      total: requests.length,
    };
  }

  async approve(requestId: string, actor: AuthUser) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.status !== 'pending') {
      throw new NotFoundException('Solicitação não encontrada');
    }

    const profile = await this.prisma.profile.findUnique({
      where: { id: request.profileId },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    await this.prisma.$transaction([
      this.prisma.verificationRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewedBy: actor.id,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.profile.update({
        where: { id: profile.id },
        data: { isVerified: true },
      }),
    ]);

    await this.search.indexProfile(profile.id);

    this.events.emit(DomainEvents.VerificationApproved, {
      requestId,
      profileId: profile.id,
      userId: profile.userId,
      displayName: profile.displayName,
      slug: profile.slug,
    } satisfies VerificationRequestPayload);

    return { success: true, profileId: profile.id, isVerified: true };
  }

  async reject(requestId: string, reason: string | undefined, actor: AuthUser) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.status !== 'pending') {
      throw new NotFoundException('Solicitação não encontrada');
    }

    const profile = await this.prisma.profile.findUnique({
      where: { id: request.profileId },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    await this.prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        rejectionReason: reason?.trim().slice(0, 500) || 'Solicitação não aprovada',
        reviewedBy: actor.id,
        reviewedAt: new Date(),
      },
    });

    this.events.emit(DomainEvents.VerificationRejected, {
      requestId,
      profileId: profile.id,
      userId: profile.userId,
      displayName: profile.displayName,
      slug: profile.slug,
      rejectionReason: reason,
    } satisfies VerificationRequestPayload);

    return { success: true };
  }
}
