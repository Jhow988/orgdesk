-- Add contract_id to proposals so multiple proposals can be linked to one contract
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "contract_id" TEXT;
ALTER TABLE "proposals" ADD CONSTRAINT IF NOT EXISTS "proposals_contract_id_fkey"
  FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "proposals_contract_id_idx" ON "proposals"("contract_id");
