import "server-only";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { rateForMonth } from "@/lib/rate-history";

export type Transaction = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  kind: "income" | "expense";
};

export async function getFinancialOverview(period?: { month: number; year: number }) {
  const [
    settings,
    paidPayments,
    paidCharges,
    expenses,
    paidBills,
    cleanerPaymentEntries,
    unpaidCharges,
    overdueBills,
  ] = await Promise.all([
    getSettings(),
    prisma.maintenancePayment.findMany({
      where: { status: "PAID" },
      include: { flat: { include: { floor: true } } },
    }),
    prisma.additionalCharge.findMany({
      where: { status: "PAID" },
      include: { flat: { include: { floor: true } } },
    }),
    prisma.expense.findMany({ include: { category: true } }),
    prisma.electricityBill.findMany({ where: { status: "PAID" } }),
    prisma.cleanerPaymentEntry.findMany({ include: { cleanerPayment: { include: { cleaner: true } } } }),
    prisma.additionalCharge.findMany({
      where: { status: "UNPAID" },
      include: { flat: { include: { floor: true } } },
    }),
    prisma.electricityBill.findMany({
      where: { status: "UNPAID", dueDate: { lt: new Date() } },
    }),
  ]);

  const totalMaintenanceCollected = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAdditionalIncome = paidCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalIncome = totalMaintenanceCollected + totalAdditionalIncome;

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalElectricityPaid = paidBills.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalCleanerSalaryPaid = cleanerPaymentEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalOutgoing = totalExpenses + totalElectricityPaid + totalCleanerSalaryPaid;

  const openingBalance = Number(settings.openingBalance);
  const closingBalance = openingBalance + totalIncome - totalOutgoing;

  const now = new Date();
  const month = period?.month ?? now.getMonth() + 1;
  const year = period?.year ?? now.getFullYear();
  const flatsUnpaidThisMonth = await prisma.flat.findMany({
    include: { payments: { where: { month, year } }, maintenanceRates: true, floor: true },
  });
  const pendingMaintenanceThisMonth = flatsUnpaidThisMonth
    .filter((f) => f.payments[0]?.status !== "PAID")
    .reduce(
      (sum, f) =>
        sum +
        rateForMonth(
          f.maintenanceRates.map((r) => ({
            amount: Number(r.amount),
            effectiveMonth: r.effectiveMonth,
            effectiveYear: r.effectiveYear,
          })),
          month,
          year,
        ),
      0,
    );
  const pendingCharges = unpaidCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const outstandingDues = pendingMaintenanceThisMonth + pendingCharges;

  const transactions: Transaction[] = [
    ...paidPayments.map((p) => ({
      id: `payment-${p.id}`,
      date: p.paymentDate ?? p.createdAt,
      description: `Maintenance — ${p.flat.floor.name} / ${p.flat.flatNumber}`,
      amount: Number(p.amount),
      kind: "income" as const,
    })),
    ...paidCharges.map((c) => ({
      id: `charge-${c.id}`,
      date: c.paymentDate ?? c.createdAt,
      description: `${c.description} — ${c.flat.floor.name} / ${c.flat.flatNumber}`,
      amount: Number(c.amount),
      kind: "income" as const,
    })),
    ...expenses.map((e) => ({
      id: `expense-${e.id}`,
      date: e.date,
      description: `${e.category.name} — ${e.description}`,
      amount: Number(e.amount),
      kind: "expense" as const,
    })),
    ...paidBills.map((b) => ({
      id: `bill-${b.id}`,
      date: b.paymentDate ?? b.createdAt,
      description: `${b.type === "LIFT" ? "Lift" : "Common Area"} Electricity Bill`,
      amount: Number(b.amount),
      kind: "expense" as const,
    })),
    ...cleanerPaymentEntries.map((e) => ({
      id: `cleaner-payment-entry-${e.id}`,
      date: e.paymentDate,
      description: `Cleaner Salary — ${e.cleanerPayment.cleaner.name}`,
      amount: Number(e.amount),
      kind: "expense" as const,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const monthTransactions = transactions.filter(
    (t) => t.date.getMonth() + 1 === month && t.date.getFullYear() === year,
  );
  const monthIncome = monthTransactions
    .filter((t) => t.kind === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const monthExpenses = monthTransactions
    .filter((t) => t.kind === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    settings,
    totalMaintenanceCollected,
    totalAdditionalIncome,
    totalIncome,
    totalExpenses,
    totalElectricityPaid,
    totalCleanerSalaryPaid,
    totalOutgoing,
    openingBalance,
    closingBalance,
    outstandingDues,
    pendingMaintenanceThisMonth,
    pendingCharges,
    monthIncome,
    monthExpenses,
    monthTransactions,
    recentTransactions: transactions.slice(0, 10),
    overdueBills,
    overdueCharges: unpaidCharges.filter((c) => c.dueDate && c.dueDate < now),
  };
}
