-- Drop Bling integration table
DROP TABLE IF EXISTS "bling_integrations";

-- Drop account receivables table (data originated exclusively from Bling)
DROP TABLE IF EXISTS "account_receivables";

-- Remove bling_id from clients
ALTER TABLE "clients" DROP COLUMN IF EXISTS "bling_id";

-- Remove bling_id index and column from products
DROP INDEX IF EXISTS "products_organization_id_bling_id_key";
ALTER TABLE "products" DROP COLUMN IF EXISTS "bling_id";
