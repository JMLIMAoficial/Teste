-- AlterTable
ALTER TABLE "media"."videos" ALTER COLUMN "status" SET DEFAULT 'approved';

-- Approve existing pending videos (no longer require moderation)
UPDATE "media"."videos"
SET "status" = 'approved'
WHERE "status" = 'pending' AND "deleted_at" IS NULL;