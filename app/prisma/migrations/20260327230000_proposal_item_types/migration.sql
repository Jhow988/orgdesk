-- Add ProposalItemType enum
CREATE TYPE "ProposalItemType" AS ENUM ('MONTHLY_SERVICE', 'ONETIME_SERVICE', 'EQUIPMENT_RENTAL', 'EQUIPMENT_PURCHASE');

-- Add item_type to proposal_items
ALTER TABLE "proposal_items" ADD COLUMN IF NOT EXISTS "item_type" "ProposalItemType" NOT NULL DEFAULT 'MONTHLY_SERVICE';

-- Add new fields to proposals
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "total_monthly"  DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "total_onetime"  DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "payment_method" TEXT;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "freight"        DECIMAL(12,2) NOT NULL DEFAULT 0;
