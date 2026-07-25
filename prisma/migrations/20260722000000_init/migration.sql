-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "analytics";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cms";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "engagement";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "media";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "platform";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "profiles";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "users";

-- CreateEnum
CREATE TYPE "auth"."DeviceType" AS ENUM ('desktop', 'mobile', 'tablet', 'unknown');

-- CreateEnum
CREATE TYPE "auth"."AuthSurface" AS ENUM ('companion', 'admin');

-- CreateEnum
CREATE TYPE "users"."UserStatus" AS ENUM ('active', 'inactive', 'blocked', 'pending_verification');

-- CreateEnum
CREATE TYPE "profiles"."ProfileStatus" AS ENUM ('pending', 'approved', 'rejected', 'blocked');

-- CreateEnum
CREATE TYPE "profiles"."ProfilePosition" AS ENUM ('active', 'passive', 'versatile');

-- CreateEnum
CREATE TYPE "profiles"."PricingDisplayMode" AS ENUM ('show', 'consult', 'hidden');

-- CreateEnum
CREATE TYPE "media"."MediaAssetStatus" AS ENUM ('uploading', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "media"."PhotoStatus" AS ENUM ('pending', 'approved', 'rejected', 'hidden');

-- CreateEnum
CREATE TYPE "media"."ContentStatus" AS ENUM ('pending', 'approved', 'rejected', 'hidden', 'removed');

-- CreateEnum
CREATE TYPE "media"."MomentMediaType" AS ENUM ('photo', 'video');

-- CreateEnum
CREATE TYPE "analytics"."HotScoreLevel" AS ENUM ('cold', 'warm', 'hot', 'blazing');

-- CreateEnum
CREATE TYPE "engagement"."CommentTargetType" AS ENUM ('profile', 'moment', 'video');

-- CreateEnum
CREATE TYPE "engagement"."LikeTargetType" AS ENUM ('moment', 'video');

-- CreateEnum
CREATE TYPE "engagement"."EngagementStatus" AS ENUM ('pending', 'approved', 'rejected', 'hidden');

-- CreateEnum
CREATE TYPE "platform"."NotificationPriority" AS ENUM ('low', 'normal', 'high', 'critical');

-- CreateEnum
CREATE TYPE "platform"."NotificationStatus" AS ENUM ('unread', 'read', 'archived');

-- CreateEnum
CREATE TYPE "platform"."ConversationStatus" AS ENUM ('open', 'in_progress', 'answered', 'closed');

-- CreateEnum
CREATE TYPE "platform"."ConversationPriority" AS ENUM ('low', 'normal', 'high', 'critical');

-- CreateEnum
CREATE TYPE "platform"."MessageSenderType" AS ENUM ('companion', 'admin', 'system');

-- CreateEnum
CREATE TYPE "platform"."VerificationRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "platform"."ReportTargetType" AS ENUM ('profile', 'comment', 'moment', 'review');

-- CreateEnum
CREATE TYPE "platform"."ReportReason" AS ENUM ('fake', 'inappropriate', 'spam', 'harassment', 'other');

-- CreateEnum
CREATE TYPE "platform"."ReportStatus" AS ENUM ('pending', 'resolved', 'dismissed');

-- CreateTable
CREATE TABLE "auth"."credentials" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "password_changed_at" TIMESTAMP(3),
    "failed_attempts" SMALLINT NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(100),
    "device_type" "auth"."DeviceType" NOT NULL DEFAULT 'unknown',
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "surface" "auth"."AuthSurface" NOT NULL DEFAULT 'companion',
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "users"."UserStatus" NOT NULL DEFAULT 'pending_verification',
    "display_name" VARCHAR(100),
    "last_login_at" TIMESTAMP(3),
    "blocked_at" TIMESTAMP(3),
    "blocked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "users"."user_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles"."profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "birth_date" DATE,
    "bio" TEXT,
    "sexual_preference" VARCHAR(50),
    "position" "profiles"."ProfilePosition",
    "penis_size_cm" SMALLINT,
    "status" "profiles"."ProfileStatus" NOT NULL DEFAULT 'pending',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "premium_expires_at" TIMESTAMP(3),
    "featured_expires_at" TIMESTAMP(3),
    "pricing_display_mode" "profiles"."PricingDisplayMode" NOT NULL DEFAULT 'show',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "seo_indexable" BOOLEAN NOT NULL DEFAULT true,
    "whatsapp" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles"."profile_locations" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "cep" VARCHAR(10),
    "neighborhood" VARCHAR(100),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles"."profile_pricing" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "thirty_min" INTEGER,
    "one_hour" INTEGER,
    "two_hours" INTEGER,
    "overnight" INTEGER,
    "custom_items" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles"."profile_availability" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media"."media_assets" (
    "id" UUID NOT NULL,
    "owner_type" VARCHAR(50) NOT NULL DEFAULT 'photo',
    "storage_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "status" "media"."MediaAssetStatus" NOT NULL DEFAULT 'uploading',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media"."photos" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "status" "media"."PhotoStatus" NOT NULL DEFAULT 'pending',
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media"."videos" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "description" TEXT,
    "status" "media"."ContentStatus" NOT NULL DEFAULT 'pending',
    "show_in_profile" BOOLEAN NOT NULL DEFAULT true,
    "show_in_gallery" BOOLEAN NOT NULL DEFAULT true,
    "duration_seconds" INTEGER,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media"."moments" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "media_type" "media"."MomentMediaType" NOT NULL DEFAULT 'photo',
    "caption" VARCHAR(300),
    "status" "media"."ContentStatus" NOT NULL DEFAULT 'pending',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "moments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms"."tag_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "tag_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms"."tags" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category_id" UUID,
    "profile_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms"."seo_metadata" (
    "id" UUID NOT NULL,
    "entity_type" VARCHAR(30) NOT NULL,
    "entity_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "description" VARCHAR(300),
    "og_image_url" VARCHAR(500),
    "canonical_url" VARCHAR(500),
    "robots" VARCHAR(50),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles"."profile_tags" (
    "profile_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "profile_tags_pkey" PRIMARY KEY ("profile_id","tag_id")
);

-- CreateTable
CREATE TABLE "analytics"."analytics_events" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "profile_id" UUID,
    "session_id" VARCHAR(64),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."hot_scores" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "level" "analytics"."HotScoreLevel" NOT NULL DEFAULT 'cold',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hot_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement"."comments" (
    "id" UUID NOT NULL,
    "target_type" "engagement"."CommentTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "author_name" VARCHAR(100) NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "status" "engagement"."EngagementStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement"."reviews" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "author_name" VARCHAR(100) NOT NULL,
    "author_fingerprint" VARCHAR(64),
    "rating" SMALLINT NOT NULL,
    "comment" VARCHAR(500),
    "status" "engagement"."EngagementStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement"."review_summaries" (
    "profile_id" UUID NOT NULL,
    "average_rating" DECIMAL(3,2) NOT NULL,
    "review_count" INTEGER NOT NULL,
    "distribution" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_summaries_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "engagement"."likes" (
    "id" UUID NOT NULL,
    "target_type" "engagement"."LikeTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "visitor_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "platform"."NotificationPriority" NOT NULL DEFAULT 'normal',
    "status" "platform"."NotificationStatus" NOT NULL DEFAULT 'unread',
    "source_event" VARCHAR(50),
    "source_event_id" UUID,
    "action_url" VARCHAR(500),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."conversations" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject" VARCHAR(100) NOT NULL,
    "status" "platform"."ConversationStatus" NOT NULL DEFAULT 'open',
    "priority" "platform"."ConversationPriority" NOT NULL DEFAULT 'normal',
    "assigned_to" UUID,
    "internal_notes" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_type" "platform"."MessageSenderType" NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."site_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "description" VARCHAR(200),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "platform"."audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_email" VARCHAR(255),
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."reports" (
    "id" UUID NOT NULL,
    "target_type" "platform"."ReportTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "profile_id" UUID,
    "reason" "platform"."ReportReason" NOT NULL,
    "description" VARCHAR(500),
    "reporter_ip" VARCHAR(45),
    "status" "platform"."ReportStatus" NOT NULL DEFAULT 'pending',
    "resolution" VARCHAR(500),
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."verification_requests" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "status" "platform"."VerificationRequestStatus" NOT NULL DEFAULT 'pending',
    "note" VARCHAR(500),
    "rejection_reason" VARCHAR(500),
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credentials_user_id_key" ON "auth"."credentials"("user_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "users"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "users"."user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"."profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_slug_key" ON "profiles"."profiles"("slug");

-- CreateIndex
CREATE INDEX "profiles_status_is_public_idx" ON "profiles"."profiles"("status", "is_public");

-- CreateIndex
CREATE UNIQUE INDEX "profile_locations_profile_id_key" ON "profiles"."profile_locations"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_pricing_profile_id_key" ON "profiles"."profile_pricing"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_availability_profile_id_day_of_week_key" ON "profiles"."profile_availability"("profile_id", "day_of_week");

-- CreateIndex
CREATE INDEX "photos_profile_id_status_idx" ON "media"."photos"("profile_id", "status");

-- CreateIndex
CREATE INDEX "videos_profile_id_status_idx" ON "media"."videos"("profile_id", "status");

-- CreateIndex
CREATE INDEX "videos_status_show_in_gallery_idx" ON "media"."videos"("status", "show_in_gallery");

-- CreateIndex
CREATE INDEX "moments_profile_id_status_idx" ON "media"."moments"("profile_id", "status");

-- CreateIndex
CREATE INDEX "moments_status_published_at_idx" ON "media"."moments"("status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "tag_categories_slug_key" ON "cms"."tag_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "cms"."tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "seo_metadata_entity_type_entity_id_key" ON "cms"."seo_metadata"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "analytics_events_event_type_created_at_idx" ON "analytics"."analytics_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_profile_id_created_at_idx" ON "analytics"."analytics_events"("profile_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "hot_scores_profile_id_key" ON "analytics"."hot_scores"("profile_id");

-- CreateIndex
CREATE INDEX "hot_scores_score_idx" ON "analytics"."hot_scores"("score");

-- CreateIndex
CREATE INDEX "comments_target_type_target_id_status_idx" ON "engagement"."comments"("target_type", "target_id", "status");

-- CreateIndex
CREATE INDEX "comments_profile_id_status_idx" ON "engagement"."comments"("profile_id", "status");

-- CreateIndex
CREATE INDEX "reviews_profile_id_status_idx" ON "engagement"."reviews"("profile_id", "status");

-- CreateIndex
CREATE INDEX "likes_target_type_target_id_idx" ON "engagement"."likes"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "likes_target_type_target_id_visitor_id_key" ON "engagement"."likes"("target_type", "target_id", "visitor_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_status_created_at_idx" ON "platform"."notifications"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "conversations_user_id_status_idx" ON "platform"."conversations"("user_id", "status");

-- CreateIndex
CREATE INDEX "conversations_status_updated_at_idx" ON "platform"."conversations"("status", "updated_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "platform"."messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "platform"."audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "platform"."audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "platform"."audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "platform"."reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "verification_requests_status_created_at_idx" ON "platform"."verification_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "verification_requests_profile_id_created_at_idx" ON "platform"."verification_requests"("profile_id", "created_at");

-- AddForeignKey
ALTER TABLE "users"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "users"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles"."profile_locations" ADD CONSTRAINT "profile_locations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles"."profile_pricing" ADD CONSTRAINT "profile_pricing_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles"."profile_availability" ADD CONSTRAINT "profile_availability_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."photos" ADD CONSTRAINT "photos_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."photos" ADD CONSTRAINT "photos_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media"."media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."videos" ADD CONSTRAINT "videos_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."videos" ADD CONSTRAINT "videos_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media"."media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."moments" ADD CONSTRAINT "moments_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."moments" ADD CONSTRAINT "moments_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media"."media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms"."tags" ADD CONSTRAINT "tags_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "cms"."tag_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles"."profile_tags" ADD CONSTRAINT "profile_tags_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement"."reviews" ADD CONSTRAINT "reviews_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "platform"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

