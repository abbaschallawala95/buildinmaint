-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'BUILDING_ADMIN';

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- Data migration: everything that already exists in this deployment belongs to one
-- building. Seed it from the existing (singleton) Settings row's buildingName, using a
-- fixed id so every backfill statement below references the same building.
INSERT INTO "buildings" ("id", "name")
SELECT 'e38eb784-2eb1-49f7-842c-75c7635e5de9', COALESCE((SELECT "buildingName" FROM "settings" LIMIT 1), 'My Building');

-- AlterTable: add buildingId columns nullable first, so existing rows can be backfilled
-- before the NOT NULL constraint is applied.
ALTER TABLE "floors" ADD COLUMN     "buildingId" TEXT;
ALTER TABLE "cleaners" ADD COLUMN     "buildingId" TEXT;
ALTER TABLE "expense_categories" ADD COLUMN     "buildingId" TEXT;
ALTER TABLE "expenses" ADD COLUMN     "buildingId" TEXT;
ALTER TABLE "electricity_bills" ADD COLUMN     "buildingId" TEXT;
ALTER TABLE "settings" ADD COLUMN     "buildingId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN     "buildingId" TEXT;
ALTER TABLE "profiles" ADD COLUMN     "buildingId" TEXT;

-- Backfill: everything existing belongs to the one building created above. SUPER_ADMIN
-- profiles stay buildingId = NULL (they're cross-building); MEMBER profiles get it.
UPDATE "floors" SET "buildingId" = 'e38eb784-2eb1-49f7-842c-75c7635e5de9';
UPDATE "cleaners" SET "buildingId" = 'e38eb784-2eb1-49f7-842c-75c7635e5de9';
UPDATE "expense_categories" SET "buildingId" = 'e38eb784-2eb1-49f7-842c-75c7635e5de9';
UPDATE "expenses" SET "buildingId" = 'e38eb784-2eb1-49f7-842c-75c7635e5de9';
UPDATE "electricity_bills" SET "buildingId" = 'e38eb784-2eb1-49f7-842c-75c7635e5de9';
UPDATE "settings" SET "buildingId" = 'e38eb784-2eb1-49f7-842c-75c7635e5de9';
UPDATE "audit_logs" SET "buildingId" = 'e38eb784-2eb1-49f7-842c-75c7635e5de9';
UPDATE "profiles" SET "buildingId" = 'e38eb784-2eb1-49f7-842c-75c7635e5de9' WHERE "role" = 'MEMBER';

-- AlterTable: now that every row is backfilled, enforce NOT NULL where the schema requires it.
ALTER TABLE "floors" ALTER COLUMN "buildingId" SET NOT NULL;
ALTER TABLE "cleaners" ALTER COLUMN "buildingId" SET NOT NULL;
ALTER TABLE "expense_categories" ALTER COLUMN "buildingId" SET NOT NULL;
ALTER TABLE "expenses" ALTER COLUMN "buildingId" SET NOT NULL;
ALTER TABLE "electricity_bills" ALTER COLUMN "buildingId" SET NOT NULL;
ALTER TABLE "settings" ALTER COLUMN "buildingId" SET NOT NULL;

-- DropIndex: expense category names are now unique per building, not globally.
DROP INDEX "expense_categories_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_buildingId_name_key" ON "expense_categories"("buildingId", "name");
CREATE UNIQUE INDEX "settings_buildingId_key" ON "settings"("buildingId");

-- Enforce exactly one BUILDING_ADMIN per building at the DB level (app also checks this on create).
CREATE UNIQUE INDEX "profiles_building_admin_unique" ON "profiles"("buildingId") WHERE "role" = 'BUILDING_ADMIN';

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "floors" ADD CONSTRAINT "floors_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "electricity_bills" ADD CONSTRAINT "electricity_bills_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cleaners" ADD CONSTRAINT "cleaners_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "settings" ADD CONSTRAINT "settings_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
