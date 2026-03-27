-- Add download tracking fields to campaign_sends
ALTER TABLE "campaign_sends" ADD COLUMN IF NOT EXISTS "boleto_downloaded_at" TIMESTAMP(3);
ALTER TABLE "campaign_sends" ADD COLUMN IF NOT EXISTS "nf_downloaded_at" TIMESTAMP(3);
