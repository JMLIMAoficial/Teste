import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvents } from '../events/domain-events';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../platform/audit.service';
import { AuthUser } from '../common/auth.types';

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly audit: AuditService,
  ) {}

  async listForCompanion(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { userId },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      data: conversations.map((c) => this.toConversationSummary(c)),
    };
  }

  async getForCompanion(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');
    return this.toConversationDetail(conversation);
  }

  async createConversation(userId: string, subject: string, body: string) {
    if (!subject.trim() || !body.trim()) {
      throw new BadRequestException('Assunto e mensagem são obrigatórios');
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const conversation = await this.prisma.conversation.create({
      data: {
        profileId: profile.id,
        userId,
        subject: subject.trim().slice(0, 100),
        status: 'open',
      },
    });

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'companion',
        senderId: userId,
        body: body.trim().slice(0, 2000),
      },
    });

    this.events.emit(DomainEvents.MessageSent, {
      conversationId: conversation.id,
      messageId: message.id,
      profileId: profile.id,
      userId,
      subject: conversation.subject,
      senderType: 'companion',
    });

    return this.getForCompanion(userId, conversation.id);
  }

  async replyAsCompanion(userId: string, conversationId: string, body: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');
    if (conversation.status === 'closed') {
      throw new BadRequestException('Conversa encerrada');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderType: 'companion',
        senderId: userId,
        body: body.trim().slice(0, 2000),
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'open', updatedAt: new Date() },
    });

    this.events.emit(DomainEvents.MessageSent, {
      conversationId,
      messageId: message.id,
      profileId: conversation.profileId,
      userId,
      subject: conversation.subject,
      senderType: 'companion',
    });

    return this.getForCompanion(userId, conversationId);
  }

  async listForAdmin(status?: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 50,
    });

    const profileIds = [...new Set(conversations.map((c) => c.profileId))];
    const profiles = await this.prisma.profile.findMany({
      where: { id: { in: profileIds } },
      select: { id: true, displayName: true, slug: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    return {
      data: conversations.map((c) => ({
        ...this.toConversationSummary(c),
        profileName: profileMap.get(c.profileId)?.displayName ?? '—',
        profileSlug: profileMap.get(c.profileId)?.slug,
      })),
    };
  }

  async getForAdmin(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');

    const profile = await this.prisma.profile.findUnique({
      where: { id: conversation.profileId },
      select: { displayName: true, slug: true },
    });

    return {
      ...this.toConversationDetail(conversation),
      profileName: profile?.displayName,
      profileSlug: profile?.slug,
    };
  }

  async replyAsAdmin(admin: AuthUser, conversationId: string, body: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderType: 'admin',
        senderId: admin.id,
        body: body.trim().slice(0, 2000),
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'answered', updatedAt: new Date() },
    });

    this.events.emit(DomainEvents.MessageAnswered, {
      conversationId,
      messageId: message.id,
      userId: conversation.userId,
      subject: conversation.subject,
    });

    await this.audit.log({
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'conversation.replied',
      entityType: 'conversation',
      entityId: conversationId,
    });

    return this.getForAdmin(conversationId);
  }

  async closeConversation(admin: AuthUser, conversationId: string) {
    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'closed', closedAt: new Date() },
    });

    this.events.emit(DomainEvents.ConversationClosed, {
      conversationId,
      userId: conversation.userId,
      subject: conversation.subject,
    });

    await this.audit.log({
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'conversation.closed',
      entityType: 'conversation',
      entityId: conversationId,
    });

    return { id: conversation.id, status: conversation.status };
  }

  private toConversationSummary(conversation: {
    id: string;
    subject: string;
    status: string;
    priority: string;
    updatedAt: Date;
    createdAt: Date;
    messages: Array<{ body: string; createdAt: Date; senderType: string }>;
  }) {
    const last = conversation.messages[0];
    return {
      id: conversation.id,
      subject: conversation.subject,
      status: conversation.status,
      priority: conversation.priority,
      lastMessage: last
        ? { body: last.body.slice(0, 120), createdAt: last.createdAt, senderType: last.senderType }
        : null,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
    };
  }

  private toConversationDetail(conversation: {
    id: string;
    subject: string;
    status: string;
    priority: string;
    createdAt: Date;
    updatedAt: Date;
    messages: Array<{
      id: string;
      body: string;
      senderType: string;
      senderId: string;
      createdAt: Date;
      readAt: Date | null;
    }>;
  }) {
    return {
      id: conversation.id,
      subject: conversation.subject,
      status: conversation.status,
      priority: conversation.priority,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        body: m.body,
        senderType: m.senderType,
        createdAt: m.createdAt,
        isRead: !!m.readAt,
      })),
    };
  }
}
