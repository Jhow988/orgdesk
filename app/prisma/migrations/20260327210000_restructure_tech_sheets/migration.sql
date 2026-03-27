-- Replace free-text sections with structured fields
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "remote_tool"     TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "remote_id"       TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "remote_password" TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "remote_notes"    TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "gateway"         TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "dns_primary"     TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "dhcp_range"      TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "network_notes"   TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "software_notes"  TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "contact_name"    TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "contact_role"    TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "contact_phone"   TEXT;
ALTER TABLE "client_tech_sheets" ADD COLUMN IF NOT EXISTS "contact_email"   TEXT;

ALTER TABLE "client_tech_sheets" DROP COLUMN IF EXISTS "remote_access";
ALTER TABLE "client_tech_sheets" DROP COLUMN IF EXISTS "network";
ALTER TABLE "client_tech_sheets" DROP COLUMN IF EXISTS "software";
ALTER TABLE "client_tech_sheets" DROP COLUMN IF EXISTS "contacts";
