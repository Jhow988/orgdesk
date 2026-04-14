-- CreateTable empresas
CREATE TABLE "empresas" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cnpj" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "logo_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "empresas_organization_id_cnpj_key" ON "empresas"("organization_id", "cnpj");
CREATE INDEX "empresas_organization_id_idx" ON "empresas"("organization_id");

-- AddForeignKey empresas -> organizations
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddColumn empresa_id to clients
ALTER TABLE "clients" ADD COLUMN "empresa_id" TEXT;
ALTER TABLE "clients" ADD CONSTRAINT "clients_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "clients_empresa_id_idx" ON "clients"("empresa_id");

-- AddColumn empresa_id to boletos
ALTER TABLE "boletos" ADD COLUMN "empresa_id" TEXT;
ALTER TABLE "boletos" ADD CONSTRAINT "boletos_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "boletos_empresa_id_idx" ON "boletos"("empresa_id");

-- AddColumn empresa_id to invoices
ALTER TABLE "invoices" ADD COLUMN "empresa_id" TEXT;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "invoices_empresa_id_idx" ON "invoices"("empresa_id");

-- AddColumn empresa_id to pix_charges
ALTER TABLE "pix_charges" ADD COLUMN "empresa_id" TEXT;
ALTER TABLE "pix_charges" ADD CONSTRAINT "pix_charges_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "pix_charges_empresa_id_idx" ON "pix_charges"("empresa_id");
