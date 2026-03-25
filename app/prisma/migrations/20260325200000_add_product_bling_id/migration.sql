ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "bling_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "products_organization_id_bling_id_key"
  ON "products"("organization_id", "bling_id")
  WHERE "bling_id" IS NOT NULL;
