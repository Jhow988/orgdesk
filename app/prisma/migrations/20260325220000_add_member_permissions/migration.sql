-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('NONE', 'READ', 'EDIT', 'CREATE', 'FULL');

-- CreateTable
CREATE TABLE "member_permissions" (
    "id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "access" "AccessLevel" NOT NULL DEFAULT 'READ',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_permissions_membership_id_module_key" ON "member_permissions"("membership_id", "module");

-- AddForeignKey
ALTER TABLE "member_permissions" ADD CONSTRAINT "member_permissions_membership_id_fkey"
    FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
