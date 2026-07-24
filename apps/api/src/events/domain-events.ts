export const DomainEvents = {
  ProfileApproved: 'profile.approved',
  ProfileRejected: 'profile.rejected',
  ProfileCreated: 'profile.created',
  CommentCreated: 'comment.created',
  CommentApproved: 'comment.approved',
  ReviewCreated: 'review.created',
  ReviewApproved: 'review.approved',
  VideoApproved: 'video.approved',
  MomentApproved: 'moment.approved',
  UserRegistered: 'user.registered',
  MessageSent: 'message.sent',
  MessageAnswered: 'message.answered',
  ConversationClosed: 'conversation.closed',
  PremiumActivated: 'premium.activated',
  PremiumDeactivated: 'premium.deactivated',
  FeaturedActivated: 'featured.activated',
  FeaturedDeactivated: 'featured.deactivated',
  VerificationRequested: 'verification.requested',
  VerificationApproved: 'verification.approved',
  VerificationRejected: 'verification.rejected',
  ReportSubmitted: 'report.submitted',
} as const;

export type ProfileApprovedPayload = {
  userId: string;
  profileId: string;
  slug: string;
  displayName: string;
};

export type ProfileRejectedPayload = {
  userId: string;
  profileId: string;
  reason?: string;
};

export type ProfileCreatedPayload = {
  profileId: string;
  slug: string;
  displayName: string;
};

export type CommentCreatedPayload = {
  commentId: string;
  profileId: string;
  authorName: string;
  targetType: string;
};

export type ReviewCreatedPayload = {
  reviewId: string;
  profileId: string;
  authorName: string;
  rating: number;
};

export type UserRegisteredPayload = {
  userId: string;
  email: string;
  displayName: string;
};

export type MessageSentPayload = {
  conversationId: string;
  messageId: string;
  profileId: string;
  userId: string;
  subject: string;
  senderType: 'companion' | 'admin';
};

export type MessageAnsweredPayload = {
  conversationId: string;
  messageId: string;
  userId: string;
  subject: string;
};

export type ConversationClosedPayload = {
  conversationId: string;
  userId: string;
  subject: string;
};

export type PremiumStatusPayload = {
  userId: string;
  profileId: string;
  slug?: string;
  displayName?: string;
  expiresAt?: string | null;
  activatedBy?: string;
  deactivatedBy?: string;
};

export type VerificationRequestPayload = {
  requestId: string;
  profileId: string;
  userId: string;
  displayName: string;
  slug: string;
  rejectionReason?: string;
};

export type ReportSubmittedPayload = {
  reportId: string;
  targetType: string;
  targetId: string;
  profileId?: string | null;
  reason: string;
};
