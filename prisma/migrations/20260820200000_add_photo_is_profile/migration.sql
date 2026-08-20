-- AlterTable
ALTER TABLE "media"."photos" ADD COLUMN "is_profile" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: a capa atual também passa a ser a foto de perfil nos cards
UPDATE "media"."photos"
SET "is_profile" = true
WHERE "is_cover" = true;
