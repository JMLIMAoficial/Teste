import { Injectable } from '@nestjs/common';
import { NotificationPriority } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  sourceEvent?: string;
  sourceEventId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority ?? 'normal',
        sourceEvent: input.sourceEvent,
        sourceEventId: input.sourceEventId,
        actionUrl: input.actionUrl,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    await this.incrementUnread(input.userId);
    return notification;
  }

  async listForUser(userId: string, limit = 30) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId, status: { not: 'archived' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { data: notifications };
  }

  async unreadCount(userId: string) {
    const cached = await this.getCachedUnread(userId);
    if (cached !== null) return { count: cached };

    const count = await this.prisma.notification.count({
      where: { userId, status: 'unread' },
    });
    await this.setCachedUnread(userId, count);
    return { count };
  }

  async markRead(userId: string, id: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { id, userId, status: 'unread' },
      data: { status: 'read', readAt: new Date() },
    });
    if (updated.count) await this.decrementUnread(userId);
    return { updated: updated.count > 0 };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, status: 'unread' },
      data: { status: 'read', readAt: new Date() },
    });
    await this.setCachedUnread(userId, 0);
    return { success: true };
  }

  async notifyAdmins(input: Omit<CreateNotificationInput, 'userId'>) {
    const admins = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: { name: { in: ['admin', 'moderator'] } } } },
      },
      select: { id: true },
    });

    for (const admin of admins) {
      await this.create({ ...input, userId: admin.id });
    }
  }

  private async incrementUnread(userId: string) {
    const client = this.redis.getClient();
    if (!client) return;
    await client.incr(`notifications:unread:${userId}`);
  }

  private async decrementUnread(userId: string) {
    const client = this.redis.getClient();
    if (!client) return;
    const key = `notifications:unread:${userId}`;
    const val = await client.decr(key);
    if (val < 0) await client.set(key, '0');
  }

  private async setCachedUnread(userId: string, count: number) {
    const client = this.redis.getClient();
    if (!client) return;
    await client.set(`notifications:unread:${userId}`, String(count));
  }

  private async getCachedUnread(userId: string): Promise<number | null> {
    const client = this.redis.getClient();
    if (!client) return null;
    const val = await client.get(`notifications:unread:${userId}`);
    return val !== null ? parseInt(val, 10) : null;
  }
}
