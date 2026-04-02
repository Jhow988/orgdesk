CREATE TABLE "knowledge_articles" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "title"           TEXT NOT NULL,
  "content"         TEXT NOT NULL,
  "category"        TEXT,
  "visibility"      TEXT NOT NULL DEFAULT 'PUBLIC',
  "status"          TEXT NOT NULL DEFAULT 'DRAFT',
  "created_by"      TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "knowledge_articles_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "knowledge_articles_organization_id_idx" ON "knowledge_articles"("organization_id");
CREATE INDEX "knowledge_articles_org_vis_status_idx" ON "knowledge_articles"("organization_id", "visibility", "status");
