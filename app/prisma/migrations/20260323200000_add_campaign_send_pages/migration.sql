-- AddColumn nf_pages and boleto_pages to campaign_sends
ALTER TABLE "campaign_sends" ADD COLUMN "nf_pages" INTEGER[] NOT NULL DEFAULT '{}';
ALTER TABLE "campaign_sends" ADD COLUMN "boleto_pages" INTEGER[] NOT NULL DEFAULT '{}';
