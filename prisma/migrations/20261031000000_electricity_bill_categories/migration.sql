-- Electricity bill types become per-building categories (add/rename/delete in the app).
-- Every building starts with "Lift" and "Common Area"; every existing bill keeps its type.
CREATE TABLE "electricity_bill_categories" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "electricity_bill_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "electricity_bill_categories_buildingId_name_key" ON "electricity_bill_categories"("buildingId", "name");

ALTER TABLE "electricity_bill_categories" ADD CONSTRAINT "electricity_bill_categories_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same as every other table: no access through Supabase's public API, only via Prisma.
ALTER TABLE "electricity_bill_categories" ENABLE ROW LEVEL SECURITY;

INSERT INTO "electricity_bill_categories" ("id", "buildingId", "name")
SELECT gen_random_uuid()::text, b."id", n."name"
FROM "buildings" b CROSS JOIN (VALUES ('Lift'), ('Common Area')) AS n("name");

ALTER TABLE "electricity_bills" ADD COLUMN "categoryId" TEXT;

UPDATE "electricity_bills" e
SET "categoryId" = c."id"
FROM "electricity_bill_categories" c
WHERE c."buildingId" = e."buildingId"
  AND c."name" = CASE e."type" WHEN 'LIFT' THEN 'Lift' ELSE 'Common Area' END;

ALTER TABLE "electricity_bills" ALTER COLUMN "categoryId" SET NOT NULL;

ALTER TABLE "electricity_bills" ADD CONSTRAINT "electricity_bills_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "electricity_bill_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "electricity_bills" DROP COLUMN "type";

DROP TYPE "ElectricityBillType";
