-- CreateTable
CREATE TABLE "cleaners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlySalary" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaner_payments" (
    "id" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" "PaymentMethod",
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaner_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cleaner_payments_cleanerId_month_year_key" ON "cleaner_payments"("cleanerId", "month", "year");

-- AddForeignKey
ALTER TABLE "cleaner_payments" ADD CONSTRAINT "cleaner_payments_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "cleaners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaner_payments" ADD CONSTRAINT "cleaner_payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
