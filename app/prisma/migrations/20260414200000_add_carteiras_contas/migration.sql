-- Add Asaas fields to empresas
ALTER TABLE "empresas" ADD COLUMN "asaas_api_key" TEXT;
ALTER TABLE "empresas" ADD COLUMN "asaas_environment" TEXT NOT NULL DEFAULT 'SANDBOX';

-- CreateTable carteiras
CREATE TABLE "carteiras" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'CORRENTE',
  "bank" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "carteiras_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "carteiras_organization_id_idx" ON "carteiras"("organization_id");
CREATE INDEX "carteiras_empresa_id_idx" ON "carteiras"("empresa_id");

ALTER TABLE "carteiras" ADD CONSTRAINT "carteiras_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "carteiras" ADD CONSTRAINT "carteiras_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable categorias_financeiras
CREATE TABLE "categorias_financeiras" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'AMBOS',
  "color" TEXT NOT NULL DEFAULT '#6366f1',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "categorias_financeiras_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categorias_financeiras_organization_id_name_key" ON "categorias_financeiras"("organization_id", "name");
CREATE INDEX "categorias_financeiras_organization_id_idx" ON "categorias_financeiras"("organization_id");

ALTER TABLE "categorias_financeiras" ADD CONSTRAINT "categorias_financeiras_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable centros_custo
CREATE TABLE "centros_custo" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "centros_custo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "centros_custo_organization_id_name_key" ON "centros_custo"("organization_id", "name");
CREATE INDEX "centros_custo_organization_id_idx" ON "centros_custo"("organization_id");

ALTER TABLE "centros_custo" ADD CONSTRAINT "centros_custo_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable contas_pagar
CREATE TABLE "contas_pagar" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "carteira_id" TEXT NOT NULL,
  "categoria_id" TEXT,
  "centro_custo_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "due_date" TIMESTAMP(3) NOT NULL,
  "paid_at" TIMESTAMP(3),
  "paid_amount" DECIMAL(12,2),
  "supplier_name" TEXT,
  "supplier_doc" TEXT,
  "payment_method" TEXT,
  "document_number" TEXT,
  "receipt_key" TEXT,
  "recurrence" TEXT,
  "recurrence_end" TIMESTAMP(3),
  "parent_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contas_pagar_organization_id_idx" ON "contas_pagar"("organization_id");
CREATE INDEX "contas_pagar_organization_id_empresa_id_idx" ON "contas_pagar"("organization_id", "empresa_id");
CREATE INDEX "contas_pagar_organization_id_status_idx" ON "contas_pagar"("organization_id", "status");
CREATE INDEX "contas_pagar_organization_id_due_date_idx" ON "contas_pagar"("organization_id", "due_date");

ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_carteira_id_fkey"
  FOREIGN KEY ("carteira_id") REFERENCES "carteiras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_categoria_id_fkey"
  FOREIGN KEY ("categoria_id") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_centro_custo_id_fkey"
  FOREIGN KEY ("centro_custo_id") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable contas_receber
CREATE TABLE "contas_receber" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "carteira_id" TEXT NOT NULL,
  "client_id" TEXT,
  "boleto_id" TEXT,
  "pix_charge_id" TEXT,
  "categoria_id" TEXT,
  "centro_custo_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "due_date" TIMESTAMP(3) NOT NULL,
  "received_at" TIMESTAMP(3),
  "received_amount" DECIMAL(12,2),
  "payer_name" TEXT,
  "payer_doc" TEXT,
  "payment_method" TEXT,
  "document_number" TEXT,
  "receipt_key" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contas_receber_boleto_id_key" ON "contas_receber"("boleto_id");
CREATE UNIQUE INDEX "contas_receber_pix_charge_id_key" ON "contas_receber"("pix_charge_id");
CREATE INDEX "contas_receber_organization_id_idx" ON "contas_receber"("organization_id");
CREATE INDEX "contas_receber_organization_id_empresa_id_idx" ON "contas_receber"("organization_id", "empresa_id");
CREATE INDEX "contas_receber_organization_id_status_idx" ON "contas_receber"("organization_id", "status");
CREATE INDEX "contas_receber_organization_id_due_date_idx" ON "contas_receber"("organization_id", "due_date");

ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_carteira_id_fkey"
  FOREIGN KEY ("carteira_id") REFERENCES "carteiras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_boleto_id_fkey"
  FOREIGN KEY ("boleto_id") REFERENCES "boletos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_pix_charge_id_fkey"
  FOREIGN KEY ("pix_charge_id") REFERENCES "pix_charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_categoria_id_fkey"
  FOREIGN KEY ("categoria_id") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_centro_custo_id_fkey"
  FOREIGN KEY ("centro_custo_id") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
