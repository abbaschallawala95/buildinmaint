-- CreateTable
CREATE TABLE "cleaner_salary_history" (
    "id" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "effectiveMonth" INTEGER NOT NULL,
    "effectiveYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaner_salary_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaner_payment_entries" (
    "id" TEXT NOT NULL,
    "cleanerPaymentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaner_payment_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cleaner_salary_history_cleanerId_effectiveMonth_effectiveYe_key" ON "cleaner_salary_history"("cleanerId", "effectiveMonth", "effectiveYear");

-- AddForeignKey
ALTER TABLE "cleaner_salary_history" ADD CONSTRAINT "cleaner_salary_history_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "cleaners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaner_payment_entries" ADD CONSTRAINT "cleaner_payment_entries_cleanerPaymentId_fkey" FOREIGN KEY ("cleanerPaymentId") REFERENCES "cleaner_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaner_payment_entries" ADD CONSTRAINT "cleaner_payment_entries_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: seed one salary-history row per cleaner, effective from the month they were created,
-- so past months keep resolving to their current (only known) rate.
INSERT INTO "cleaner_salary_history" ("id", "cleanerId", "amount", "effectiveMonth", "effectiveYear")
SELECT gen_random_uuid(), "id", "monthlySalary", EXTRACT(MONTH FROM "createdAt")::int, EXTRACT(YEAR FROM "createdAt")::int
FROM "cleaners";

-- DataMigration: convert each existing paid cleaner_payments row into a single payment entry.
INSERT INTO "cleaner_payment_entries" ("id", "cleanerPaymentId", "amount", "paymentDate", "paymentMethod", "recordedById", "createdAt")
SELECT gen_random_uuid(), "id", "amount", COALESCE("paymentDate", "createdAt"), COALESCE("paymentMethod", 'CASH'), "recordedById", "createdAt"
FROM "cleaner_payments"
WHERE "status" = 'PAID';

-- DropForeignKey
ALTER TABLE "cleaner_payments" DROP CONSTRAINT "cleaner_payments_recordedById_fkey";

-- AlterTable
ALTER TABLE "cleaner_payments" DROP COLUMN "amount",
DROP COLUMN "paymentDate",
DROP COLUMN "paymentMethod",
DROP COLUMN "recordedById",
DROP COLUMN "status";
