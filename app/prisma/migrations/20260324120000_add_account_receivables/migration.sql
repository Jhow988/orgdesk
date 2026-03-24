CREATE TABLE "account_receivables" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "bling_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_cnpj" TEXT,
    "document_number" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "competence_date" TIMESTAMP(3),
    "value" DECIMAL(15,2) NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL,
    "status" INTEGER NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_receivables_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_receivables_organization_id_bling_id_key" ON "account_receivables"("organization_id", "bling_id");
CREATE INDEX "account_receivables_organization_id_due_date_idx" ON "account_receivables"("organization_id", "due_date");

ALTER TABLE "account_receivables" ADD CONSTRAINT "account_receivables_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
