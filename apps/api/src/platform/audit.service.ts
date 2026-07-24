import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditEntry = {
  actorId?: string;
  actorEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry) {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async list(params?: { limit?: number; action?: string }) {
    const limit = Math.min(params?.limit ?? 50, 200);
    const logs = await this.prisma.auditLog.findMany({
      where: params?.action ? { action: params.action } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      data: logs.map((l) => ({
        id: l.id,
        actorId: l.actorId,
        actorEmail: l.actorEmail,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        metadata: l.metadata,
        createdAt: l.createdAt,
      })),
      total: logs.length,
    };
  }
}
