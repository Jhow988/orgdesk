-- Add Asaas fields to boletos
ALTER TABLE "boletos" ADD COLUMN "asaas_id" TEXT;
ALTER TABLE "boletos" ADD COLUMN "asaas_customer_id" TEXT;
ALTER TABLE "boletos" ADD COLUMN "asaas_barcode" TEXT;
ALTER TABLE "boletos" ADD COLUMN "asaas_digitavel" TEXT;
ALTER TABLE "boletos" ADD COLUMN "asaas_url" TEXT;

CREATE UNIQUE INDEX "boletos_asaas_id_key" ON "boletos"("asaas_id");
