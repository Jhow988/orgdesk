-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PRODUCT', 'SERVICE');
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED');
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "PixStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');

-- CreateTable products
CREATE TABLE "products" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "type" "ProductType" NOT NULL DEFAULT 'SERVICE',
  "name" TEXT NOT NULL,
  "description" TEXT,
  "unit" TEXT DEFAULT 'un',
  "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "products_organization_id_idx" ON "products"("organization_id");

-- CreateTable proposals
CREATE TABLE "proposals" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
  "valid_until" TIMESTAMP(3),
  "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "sent_at" TIMESTAMP(3),
  "viewed_at" TIMESTAMP(3),
  "accepted_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "proposals_organization_id_number_key" ON "proposals"("organization_id", "number");
CREATE INDEX "proposals_organization_id_idx" ON "proposals"("organization_id");
CREATE INDEX "proposals_organization_id_client_id_idx" ON "proposals"("organization_id", "client_id");

-- CreateTable proposal_items
CREATE TABLE "proposal_items" (
  "id" TEXT NOT NULL,
  "proposal_id" TEXT NOT NULL,
  "product_id" TEXT,
  "description" TEXT NOT NULL,
  "unit" TEXT DEFAULT 'un',
  "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
  "unit_price" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "proposal_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "proposal_items_proposal_id_idx" ON "proposal_items"("proposal_id");

-- CreateTable contracts
CREATE TABLE "contracts" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "proposal_id" TEXT,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "pdf_key" TEXT,
  "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
  "sent_at" TIMESTAMP(3),
  "viewed_at" TIMESTAMP(3),
  "signed_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "sign_token" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contracts_sign_token_key" ON "contracts"("sign_token");
CREATE INDEX "contracts_organization_id_idx" ON "contracts"("organization_id");
CREATE INDEX "contracts_organization_id_client_id_idx" ON "contracts"("organization_id", "client_id");

-- CreateTable pix_charges
CREATE TABLE "pix_charges" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "pix_key" TEXT,
  "qr_code" TEXT,
  "qr_code_image" TEXT,
  "status" "PixStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pix_charges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pix_charges_organization_id_idx" ON "pix_charges"("organization_id");
CREATE INDEX "pix_charges_organization_id_client_id_idx" ON "pix_charges"("organization_id", "client_id");
CREATE INDEX "pix_charges_organization_id_status_idx" ON "pix_charges"("organization_id", "status");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pix_charges" ADD CONSTRAINT "pix_charges_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pix_charges" ADD CONSTRAINT "pix_charges_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
