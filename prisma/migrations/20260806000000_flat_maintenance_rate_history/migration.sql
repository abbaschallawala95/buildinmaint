-- CreateTable
CREATE TABLE "flat_maintenance_rates" (
    "id" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "effectiveMonth" INTEGER NOT NULL,
    "effectiveYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flat_maintenance_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flat_maintenance_rates_flatId_effectiveMonth_effectiveYear_key" ON "flat_maintenance_rates"("flatId", "effectiveMonth", "effectiveYear");

-- AddForeignKey
ALTER TABLE "flat_maintenance_rates" ADD CONSTRAINT "flat_maintenance_rates_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "flats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: seed every existing flat with a Jan 2026 rate entry at its current amount,
-- so dues carry forward from Jan 2026 using the rate that was in effect at the time.
INSERT INTO "flat_maintenance_rates" ("id", "flatId", "amount", "effectiveMonth", "effectiveYear")
SELECT gen_random_uuid(), "id", "monthlyMaintenanceAmount", 1, 2026
FROM "flats";
