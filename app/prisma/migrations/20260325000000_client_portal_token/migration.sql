-- Add portal token and last access tracking to clients
ALTER TABLE "clients"
  ADD COLUMN "portal_token"       TEXT,
  ADD COLUMN "last_portal_access" TIMESTAMP(3);

-- Generate unique tokens for existing clients
UPDATE "clients" SET "portal_token" = gen_random_uuid()::text WHERE "portal_token" IS NULL;

-- Make portal_token unique
CREATE UNIQUE INDEX "clients_portal_token_key" ON "clients"("portal_token");
