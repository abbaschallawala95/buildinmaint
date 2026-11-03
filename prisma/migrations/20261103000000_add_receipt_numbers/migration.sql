-- Running receipt numbers per building. Additive.
ALTER TABLE "maintenance_payments" ADD COLUMN "receiptNumber" INTEGER;
ALTER TABLE "settings" ADD COLUMN "lastReceiptNumber" INTEGER NOT NULL DEFAULT 0;

-- Receipts start with November 2026: payments already saved for it are numbered from 1 in date
-- order. Earlier months stay unnumbered.
WITH numbered AS (
  SELECT p."id", ROW_NUMBER() OVER (PARTITION BY fl."buildingId" ORDER BY p."paymentDate", p."createdAt", p."id") AS n
  FROM "maintenance_payments" p
  JOIN "flats" f ON f."id" = p."flatId"
  JOIN "floors" fl ON fl."id" = f."floorId"
  WHERE p."status" = 'PAID' AND p."amount" > 0 AND (p."year", p."month") >= (2026, 11)
)
UPDATE "maintenance_payments" p SET "receiptNumber" = numbered.n FROM numbered WHERE p."id" = numbered."id";

-- Settings rows are otherwise created on first use; the counter needs one for every building.
INSERT INTO "settings" ("id", "buildingId", "buildingName")
SELECT gen_random_uuid()::text, b."id", b."name" FROM "buildings" b
WHERE NOT EXISTS (SELECT 1 FROM "settings" s WHERE s."buildingId" = b."id");

UPDATE "settings" s SET "lastReceiptNumber" = COALESCE((
  SELECT MAX(p."receiptNumber")
  FROM "maintenance_payments" p
  JOIN "flats" f ON f."id" = p."flatId"
  JOIN "floors" fl ON fl."id" = f."floorId"
  WHERE fl."buildingId" = s."buildingId"
), 0);
