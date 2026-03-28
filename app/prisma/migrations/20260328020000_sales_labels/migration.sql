CREATE TABLE "sales_labels" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "organization_id" TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "color"           TEXT NOT NULL DEFAULT '#6366f1',
  "description"     TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sales_labels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "sales_labels_organization_id_idx" ON "sales_labels"("organization_id");

CREATE TABLE "proposal_labels" (
  "proposal_id" TEXT NOT NULL,
  "label_id"    TEXT NOT NULL,
  CONSTRAINT "proposal_labels_pkey" PRIMARY KEY ("proposal_id", "label_id"),
  CONSTRAINT "proposal_labels_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "proposal_labels_label_id_fkey"    FOREIGN KEY ("label_id")    REFERENCES "sales_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "contract_labels" (
  "contract_id" TEXT NOT NULL,
  "label_id"    TEXT NOT NULL,
  CONSTRAINT "contract_labels_pkey" PRIMARY KEY ("contract_id", "label_id"),
  CONSTRAINT "contract_labels_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "contract_labels_label_id_fkey"    FOREIGN KEY ("label_id")    REFERENCES "sales_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
