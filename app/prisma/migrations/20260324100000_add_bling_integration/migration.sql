-- Add bling_id to clients
ALTER TABLE "clients" ADD COLUMN "bling_id" TEXT;

-- Create bling_integrations table
CREATE TABLE "bling_integrations" (
  "id"                TEXT NOT NULL,
  "organization_id"   TEXT NOT NULL,
  "access_token_enc"  TEXT NOT NULL,
  "refresh_token_enc" TEXT NOT NULL,
  "expires_at"        TIMESTAMP(3) NOT NULL,
  "last_sync_at"      TIMESTAMP(3),
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bling_integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bling_integrations_organization_id_key"
  ON "bling_integrations"("organization_id");

ALTER TABLE "bling_integrations"
  ADD CONSTRAINT "bling_integrations_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
