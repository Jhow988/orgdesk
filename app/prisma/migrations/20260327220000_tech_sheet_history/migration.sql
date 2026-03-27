ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "additional_info"  TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "updated_by_name" TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "updated_by_id"   TEXT;
