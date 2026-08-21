-- CreateEnum
CREATE TYPE "platform"."BoostRequestType" AS ENUM ('premium', 'featured');

-- CreateEnum
CREATE TYPE "platform"."BoostRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "platform"."boost_requests" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "type" "platform"."BoostRequestType" NOT NULL,
    "status" "platform"."BoostRequestStatus" NOT NULL DEFAULT 'pending',
    "note" VARCHAR(500),
    "rejection_reason" VARCHAR(500),
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boost_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "boost_requests_status_created_at_idx" ON "platform"."boost_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "boost_requests_profile_id_type_created_at_idx" ON "platform"."boost_requests"("profile_id", "type", "created_at");
