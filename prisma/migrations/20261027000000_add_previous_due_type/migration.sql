-- Marks additional charges that are dues from before the app (Admin → Maintenance). Additive.
ALTER TABLE "additional_charges" ADD COLUMN "previousDueType" TEXT;

-- Existing entries made with the old "Add Previous Year Dues" button.
UPDATE "additional_charges" SET "previousDueType" = 'MAINTENANCE' WHERE "description" LIKE 'Previous Year Dues (%';
