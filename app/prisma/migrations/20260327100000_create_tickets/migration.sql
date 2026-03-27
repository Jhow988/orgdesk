-- Create TicketStatus enum
DO $$ BEGIN
  CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create TicketPriority enum
DO $$ BEGIN
  CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create tickets table
CREATE TABLE IF NOT EXISTS "tickets" (
    "id"              TEXT          NOT NULL,
    "organization_id" TEXT          NOT NULL,
    "number"          INTEGER       NOT NULL,
    "client_id"       TEXT          NOT NULL,
    "assigned_to"     TEXT,
    "opened_by"       TEXT          NOT NULL,
    "opened_by_type"  TEXT          NOT NULL,
    "title"           TEXT          NOT NULL,
    "category"        TEXT,
    "status"          "TicketStatus"   NOT NULL DEFAULT 'OPEN',
    "priority"        "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "sla_deadline"    TIMESTAMP(3),
    "resolved_at"     TIMESTAMP(3),
    "closed_at"       TIMESTAMP(3),
    "auto_close_at"   TIMESTAMP(3),
    "created_at"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tickets_organization_id_number_key" ON "tickets"("organization_id", "number");
CREATE INDEX IF NOT EXISTS "tickets_organization_id_idx"            ON "tickets"("organization_id");
CREATE INDEX IF NOT EXISTS "tickets_organization_id_client_id_idx"  ON "tickets"("organization_id", "client_id");
CREATE INDEX IF NOT EXISTS "tickets_organization_id_status_idx"     ON "tickets"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "tickets_organization_id_assigned_to_idx" ON "tickets"("organization_id", "assigned_to");

ALTER TABLE "tickets"
  ADD CONSTRAINT IF NOT EXISTS "tickets_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tickets"
  ADD CONSTRAINT IF NOT EXISTS "tickets_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tickets"
  ADD CONSTRAINT IF NOT EXISTS "tickets_assigned_to_fkey"
    FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create ticket_messages table
CREATE TABLE IF NOT EXISTS "ticket_messages" (
    "id"          TEXT         NOT NULL,
    "ticket_id"   TEXT         NOT NULL,
    "author_id"   TEXT         NOT NULL,
    "author_type" TEXT         NOT NULL,
    "body"        TEXT         NOT NULL,
    "is_internal" BOOLEAN      NOT NULL DEFAULT false,
    "is_auto"     BOOLEAN      NOT NULL DEFAULT false,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ticket_messages_ticket_id_idx" ON "ticket_messages"("ticket_id");

ALTER TABLE "ticket_messages"
  ADD CONSTRAINT IF NOT EXISTS "ticket_messages_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ticket_messages"
  ADD CONSTRAINT IF NOT EXISTS "ticket_messages_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create ticket_attachments table
CREATE TABLE IF NOT EXISTS "ticket_attachments" (
    "id"         TEXT         NOT NULL,
    "ticket_id"  TEXT         NOT NULL,
    "message_id" TEXT,
    "file_key"   TEXT         NOT NULL,
    "file_name"  TEXT         NOT NULL,
    "mime_type"  TEXT         NOT NULL,
    "size_kb"    DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ticket_attachments_ticket_id_idx" ON "ticket_attachments"("ticket_id");

ALTER TABLE "ticket_attachments"
  ADD CONSTRAINT IF NOT EXISTS "ticket_attachments_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ticket_attachments"
  ADD CONSTRAINT IF NOT EXISTS "ticket_attachments_message_id_fkey"
    FOREIGN KEY ("message_id") REFERENCES "ticket_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
