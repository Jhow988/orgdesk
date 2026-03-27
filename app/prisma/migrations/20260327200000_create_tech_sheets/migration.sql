CREATE TABLE IF NOT EXISTS "client_tech_sheets" (
    "id"              TEXT         NOT NULL,
    "organization_id" TEXT         NOT NULL,
    "client_id"       TEXT         NOT NULL,
    "remote_access"   TEXT,
    "network"         TEXT,
    "software"        TEXT,
    "contacts"        TEXT,
    "notes"           TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_tech_sheets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "client_tech_sheets_client_id_key" UNIQUE ("client_id"),
    CONSTRAINT "client_tech_sheets_organization_id_fkey"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "client_tech_sheets_client_id_fkey"
        FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "client_tech_sheets_organization_id_idx" ON "client_tech_sheets"("organization_id");
