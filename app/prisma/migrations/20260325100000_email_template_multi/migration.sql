-- Add name column (default 'NF e Boleto' for any existing rows)
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT 'NF e Boleto';
-- Add created_at column
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Drop old single-org unique constraint
ALTER TABLE "email_templates" DROP CONSTRAINT IF EXISTS "email_templates_organization_id_key";
-- Add composite unique constraint (org + template name)
CREATE UNIQUE INDEX IF NOT EXISTS "email_templates_organization_id_name_key"
  ON "email_templates"("organization_id", "name");
