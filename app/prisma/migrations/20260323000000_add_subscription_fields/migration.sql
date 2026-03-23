-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'OVERDUE', 'SUSPENDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "organizations"
  ADD COLUMN "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN "trial_ends_at" TIMESTAMP(3),
  ADD COLUMN "subscription_ends_at" TIMESTAMP(3),
  ADD COLUMN "billing_email" TEXT,
  ADD COLUMN "notes" TEXT;
