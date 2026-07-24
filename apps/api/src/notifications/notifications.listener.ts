import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import {
  DomainEvents,
  type CommentCreatedPayload,
  type ProfileApprovedPayload,
  type ProfileCreatedPayload,
  type ProfileRejectedPayload,
  type ReviewCreatedPayload,
  type UserRegisteredPayload,
  type MessageSentPayload,
  type MessageAnsweredPayload,
  type ConversationClosedPayload,
  type PremiumStatusPayload,
  type VerificationRequestPayload,
  type ReportSubmittedPayload,
} from '../events/domain-events';
import { PrismaService } from '../prisma/prisma.service';
import { EmailQueueService } from '../email/email-queue.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);
  private readonly siteUrl: string;

  constructor(
    private readonly notifications: NotificationsService,
    private readonly emailQueue: EmailQueueService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.siteUrl = config.get('SITE_URL', 'http://localhost:3000');
  }

  @OnEvent(DomainEvents.ProfileApproved)
  async onProfileApproved(payload: ProfileApprovedPayload) {
    await this.notifications.create({
      userId: payload.userId,
      type: 'profile_approved',
      title: 'Perfil aprovado!',
      message: `Seu perfil "${payload.displayName}" foi aprovado e está público.`,
      priority: 'high',
      sourceEvent: DomainEvents.ProfileApproved,
      sourceEventId: payload.profileId,
      actionUrl: `${this.siteUrl}/perfil/${payload.slug}`,
    });

    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (user?.email) {
      await this.emailQueue.enqueue(
        {
          to: user.email,
          subject: 'Seu perfil foi aprovado — Acompanhante',
          html: `<p>Olá ${payload.displayName},</p><p>Seu perfil foi aprovado e já está visível na plataforma.</p><p><a href="${this.siteUrl}/perfil/${payload.slug}">Ver perfil</a></p>`,
        },
        `profile-approved-${payload.profileId}`,
      );
    }
  }

  @OnEvent(DomainEvents.ProfileRejected)
  async onProfileRejected(payload: ProfileRejectedPayload) {
    await this.notifications.create({
      userId: payload.userId,
      type: 'profile_rejected',
      title: 'Perfil não aprovado',
      message: payload.reason
        ? `Seu perfil foi rejeitado: ${payload.reason}`
        : 'Seu perfil foi rejeitado. Revise as informações e tente novamente.',
      priority: 'high',
      sourceEvent: DomainEvents.ProfileRejected,
      sourceEventId: payload.profileId,
      actionUrl: `${this.siteUrl}/painel`,
    });
  }

  @OnEvent(DomainEvents.ProfileCreated)
  async onProfileCreated(payload: ProfileCreatedPayload) {
    await this.notifications.notifyAdmins({
      type: 'profile_pending',
      title: 'Novo perfil pendente',
      message: `${payload.displayName} aguarda moderação.`,
      priority: 'normal',
      sourceEvent: DomainEvents.ProfileCreated,
      sourceEventId: payload.profileId,
      actionUrl: `${this.siteUrl}/admin`,
    });
  }

  @OnEvent(DomainEvents.CommentCreated)
  async onCommentCreated(payload: CommentCreatedPayload) {
    await this.notifications.notifyAdmins({
      type: 'comment_pending',
      title: 'Novo comentário pendente',
      message: `${payload.authorName} comentou em ${payload.targetType}.`,
      priority: 'normal',
      sourceEvent: DomainEvents.CommentCreated,
      sourceEventId: payload.commentId,
      actionUrl: `${this.siteUrl}/admin`,
    });
  }

  @OnEvent(DomainEvents.ReviewCreated)
  async onReviewCreated(payload: ReviewCreatedPayload) {
    await this.notifications.notifyAdmins({
      type: 'review_pending',
      title: 'Nova avaliação pendente',
      message: `${payload.authorName} avaliou com ${payload.rating} estrelas.`,
      priority: 'normal',
      sourceEvent: DomainEvents.ReviewCreated,
      sourceEventId: payload.reviewId,
      actionUrl: `${this.siteUrl}/admin`,
    });
  }

  @OnEvent(DomainEvents.CommentApproved)
  async onCommentApproved(payload: { profileId: string; commentId: string }) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: payload.profileId },
      select: { userId: true, displayName: true },
    });
    if (!profile) return;

    await this.notifications.create({
      userId: profile.userId,
      type: 'comment_approved',
      title: 'Comentário aprovado',
      message: 'Um comentário no seu perfil foi aprovado.',
      sourceEvent: DomainEvents.CommentApproved,
      sourceEventId: payload.commentId,
      actionUrl: `${this.siteUrl}/painel`,
    });
  }

  @OnEvent(DomainEvents.ReviewApproved)
  async onReviewApproved(payload: { profileId: string; reviewId: string }) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: payload.profileId },
      select: { userId: true },
    });
    if (!profile) return;

    await this.notifications.create({
      userId: profile.userId,
      type: 'review_approved',
      title: 'Nova avaliação publicada',
      message: 'Uma avaliação no seu perfil foi aprovada.',
      sourceEvent: DomainEvents.ReviewApproved,
      sourceEventId: payload.reviewId,
      actionUrl: `${this.siteUrl}/painel`,
    });
  }

  @OnEvent(DomainEvents.UserRegistered)
  async onUserRegistered(payload: UserRegisteredPayload) {
    await this.emailQueue.enqueue(
      {
        to: payload.email,
        subject: 'Bem-vindo à Acompanhante',
        html: `<p>Olá ${payload.displayName},</p><p>Sua conta foi criada com sucesso. Complete seu perfil no painel para iniciar a moderação.</p><p><a href="${this.siteUrl}/painel">Acessar painel</a></p>`,
      },
      `welcome-${payload.userId}`,
    );
  }

  @OnEvent(DomainEvents.MessageSent)
  async onMessageSent(payload: MessageSentPayload) {
    if (payload.senderType !== 'companion') return;

    await this.notifications.notifyAdmins({
      type: 'new_message_received',
      title: 'Novo contato recebido',
      message: `Nova mensagem: "${payload.subject}"`,
      priority: 'high',
      sourceEvent: DomainEvents.MessageSent,
      sourceEventId: payload.messageId,
      actionUrl: `${this.siteUrl}/admin/mensagens`,
    });
  }

  @OnEvent(DomainEvents.MessageAnswered)
  async onMessageAnswered(payload: MessageAnsweredPayload) {
    await this.notifications.create({
      userId: payload.userId,
      type: 'message_answered',
      title: 'Resposta da administração',
      message: `Sua conversa "${payload.subject}" foi respondida.`,
      priority: 'high',
      sourceEvent: DomainEvents.MessageAnswered,
      sourceEventId: payload.messageId,
      actionUrl: `${this.siteUrl}/painel/mensagens`,
    });
  }

  @OnEvent(DomainEvents.ConversationClosed)
  async onConversationClosed(payload: ConversationClosedPayload) {
    await this.notifications.create({
      userId: payload.userId,
      type: 'conversation_closed',
      title: 'Conversa encerrada',
      message: `A conversa "${payload.subject}" foi encerrada.`,
      sourceEvent: DomainEvents.ConversationClosed,
      sourceEventId: payload.conversationId,
      actionUrl: `${this.siteUrl}/painel/mensagens`,
    });
  }

  @OnEvent(DomainEvents.PremiumActivated)
  async onPremiumActivated(payload: PremiumStatusPayload) {
    await this.notifications.create({
      userId: payload.userId,
      type: 'premium_activated',
      title: 'Status Premium ativado',
      message: payload.expiresAt
        ? `Seu perfil Premium está ativo até ${new Date(payload.expiresAt).toLocaleDateString('pt-BR')}.`
        : 'Seu perfil Premium foi ativado.',
      priority: 'high',
      sourceEvent: DomainEvents.PremiumActivated,
      sourceEventId: payload.profileId,
      actionUrl: `${this.siteUrl}/painel/status`,
    });
  }

  @OnEvent(DomainEvents.FeaturedActivated)
  async onFeaturedActivated(payload: PremiumStatusPayload) {
    await this.notifications.create({
      userId: payload.userId,
      type: 'featured_activated',
      title: 'Destaque ativado',
      message: payload.expiresAt
        ? `Seu perfil em destaque está ativo até ${new Date(payload.expiresAt).toLocaleDateString('pt-BR')}.`
        : 'Seu perfil foi colocado em destaque.',
      priority: 'high',
      sourceEvent: DomainEvents.FeaturedActivated,
      sourceEventId: payload.profileId,
      actionUrl: `${this.siteUrl}/painel/status`,
    });
  }

  @OnEvent(DomainEvents.PremiumDeactivated)
  async onPremiumDeactivated(payload: PremiumStatusPayload) {
    await this.notifications.create({
      userId: payload.userId,
      type: 'premium_deactivated',
      title: 'Status Premium removido',
      message: 'O status Premium do seu perfil foi removido.',
      priority: 'normal',
      sourceEvent: DomainEvents.PremiumDeactivated,
      sourceEventId: payload.profileId,
      actionUrl: `${this.siteUrl}/painel/status`,
    });
  }

  @OnEvent(DomainEvents.FeaturedDeactivated)
  async onFeaturedDeactivated(payload: PremiumStatusPayload) {
    await this.notifications.create({
      userId: payload.userId,
      type: 'featured_deactivated',
      title: 'Destaque removido',
      message: 'O destaque do seu perfil foi removido.',
      priority: 'normal',
      sourceEvent: DomainEvents.FeaturedDeactivated,
      sourceEventId: payload.profileId,
      actionUrl: `${this.siteUrl}/painel/status`,
    });
  }

  @OnEvent(DomainEvents.VerificationRequested)
  async onVerificationRequested(payload: VerificationRequestPayload) {
    await this.notifications.notifyAdmins({
      type: 'verification_pending',
      title: 'Nova solicitação de verificação',
      message: `${payload.displayName} solicitou o selo verificado.`,
      priority: 'high',
      sourceEvent: DomainEvents.VerificationRequested,
      sourceEventId: payload.requestId,
      actionUrl: `${this.siteUrl}/admin/verificacoes`,
    });
  }

  @OnEvent(DomainEvents.VerificationApproved)
  async onVerificationApproved(payload: VerificationRequestPayload) {
    await this.notifications.create({
      userId: payload.userId,
      type: 'verification_approved',
      title: 'Perfil verificado!',
      message: 'Seu selo de verificação foi aprovado pela equipe.',
      priority: 'high',
      sourceEvent: DomainEvents.VerificationApproved,
      sourceEventId: payload.requestId,
      actionUrl: `${this.siteUrl}/perfil/${payload.slug}`,
    });
  }

  @OnEvent(DomainEvents.VerificationRejected)
  async onVerificationRejected(payload: VerificationRequestPayload) {
    await this.notifications.create({
      userId: payload.userId,
      type: 'verification_rejected',
      title: 'Verificação não aprovada',
      message: payload.rejectionReason
        ? `Sua solicitação foi recusada: ${payload.rejectionReason}`
        : 'Sua solicitação de verificação não foi aprovada. Você pode tentar novamente.',
      priority: 'normal',
      sourceEvent: DomainEvents.VerificationRejected,
      sourceEventId: payload.requestId,
      actionUrl: `${this.siteUrl}/painel/verificacao`,
    });
  }

  @OnEvent(DomainEvents.ReportSubmitted)
  async onReportSubmitted(payload: ReportSubmittedPayload) {
    await this.notifications.notifyAdmins({
      type: 'report_pending',
      title: 'Nova denúncia',
      message: `Denúncia de ${payload.targetType}: ${payload.reason}`,
      priority: 'high',
      sourceEvent: DomainEvents.ReportSubmitted,
      sourceEventId: payload.reportId,
      actionUrl: `${this.siteUrl}/admin/denuncias`,
    });
  }
}
