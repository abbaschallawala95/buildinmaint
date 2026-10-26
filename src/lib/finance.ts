import "server-only";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { rateForMonth } from "@/lib/rate-history";
import { buildDueSchedule, totalDue } from "@/lib/maintenance-dues";

export type Transaction = {
  id: string;
  date: Date;
  description: string;
  /** what it is, without the flat — groups transactions on the Analytics page */
  head: string;
  amount: number;
  kind: "income" | "expense";
};

type DateRange = { gte: Date; lt: Date };

// Paid transactions of every kind, newest first. With `range`, only those dated inside it;
// with `take`, only the newest `take` overall. Never loads the full history.
async function loadTransactions(
  buildingId: string,
  { range, take }: { range?: DateRange; take?: number },
): Promise<Transaction[]> {
  // Rows without a paymentDate are dated by createdAt, same as the list shows them.
  const paidIn = range ? { OR: [{ paymentDate: range }, { paymentDate: null, createdAt: range }] } : {};
  // ponytail: "latest N" orders by paymentDate (nulls last); legacy rows with no paymentDate
  // could be missed from the recent list. Every current "mark paid" flow sets a date.
  const newest = { paymentDate: { sort: "desc" as const, nulls: "last" as const } };

  const [payments, charges, expenses, bills, cleanerEntries] = await Promise.all([
    prisma.maintenancePayment.findMany({
      where: { status: "PAID", flat: { floor: { buildingId } }, ...paidIn },
      include: { flat: { include: { floor: true } } },
      orderBy: newest,
      take,
    }),
    prisma.additionalCharge.findMany({
      where: { status: "PAID", flat: { floor: { buildingId } }, ...paidIn },
      include: { flat: { include: { floor: true } } },
      orderBy: newest,
      take,
    }),
    prisma.expense.findMany({
      where: { buildingId, ...(range && { date: range }) },
      include: { category: true },
      orderBy: { date: "desc" },
      take,
    }),
    prisma.electricityBill.findMany({
      where: { status: "PAID", buildingId, ...paidIn },
      orderBy: newest,
      take,
    }),
    prisma.cleanerPaymentEntry.findMany({
      where: { cleanerPayment: { cleaner: { buildingId } }, ...(range && { paymentDate: range }) },
      include: { cleanerPayment: { include: { cleaner: true } } },
      orderBy: { paymentDate: "desc" },
      take,
    }),
  ]);

  const all: Transaction[] = [
    ...payments.map((p) => ({
      id: `payment-${p.id}`,
      date: p.paymentDate ?? p.createdAt,
      description: `Maintenance — ${p.flat.floor.name} / ${p.flat.flatNumber}`,
      head: "Maintenance",
      amount: Number(p.amount),
      kind: "income" as const,
    })),
    ...charges.map((c) => ({
      id: `charge-${c.id}`,
      date: c.paymentDate ?? c.createdAt,
      description: `${c.description} — ${c.flat.floor.name} / ${c.flat.flatNumber}`,
      head: c.description,
      amount: Number(c.amount),
      kind: "income" as const,
    })),
    ...expenses.map((e) => ({
      id: `expense-${e.id}`,
      date: e.date,
      description: `${e.category.name} — ${e.description}`,
      head: e.category.name,
      amount: Number(e.amount),
      kind: "expense" as const,
    })),
    ...bills.map((b) => ({
      id: `bill-${b.id}`,
      date: b.paymentDate ?? b.createdAt,
      description: `${b.type === "LIFT" ? "Lift" : "Common Area"} Electricity Bill`,
      head: `${b.type === "LIFT" ? "Lift" : "Common Area"} Electricity Bill`,
      amount: Number(b.amount),
      kind: "expense" as const,
    })),
    ...cleanerEntries.map((e) => ({
      id: `cleaner-payment-entry-${e.id}`,
      date: e.paymentDate,
      description: `Cleaner Salary — ${e.cleanerPayment.cleaner.name}`,
      head: "Cleaner Salary",
      amount: Number(e.amount),
      kind: "expense" as const,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
  return take ? all.slice(0, take) : all;
}

// Every paid transaction of `year`, plus the previous December (the baseline for January).
export function getYearTransactions(buildingId: string, year: number) {
  return loadTransactions(buildingId, { range: { gte: new Date(year - 1, 11, 1), lt: new Date(year + 1, 0, 1) } });
}

export async function getFinancialOverview(buildingId: string, period?: { month: number; year: number }) {
  const now = new Date();
  const month = period?.month ?? now.getMonth() + 1;
  const year = period?.year ?? now.getFullYear();
  // Server runs in India time (src/instrumentation.ts), so these are IST month boundaries.
  const monthRange = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
  const flatInBuilding = { flat: { floor: { buildingId } } };
  const sumOf = (agg: { _sum: { amount: unknown } }) => Number(agg._sum.amount ?? 0);

  const [
    settings,
    maintenanceAgg,
    chargesAgg,
    expensesAgg,
    billsAgg,
    cleanerAgg,
    unpaidCharges,
    overdueBills,
    monthTransactions,
    recentTransactions,
    flats,
  ] = await Promise.all([
    getSettings(buildingId),
    prisma.maintenancePayment.aggregate({ _sum: { amount: true }, where: { status: "PAID", ...flatInBuilding } }),
    prisma.additionalCharge.aggregate({ _sum: { amount: true }, where: { status: "PAID", ...flatInBuilding } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { buildingId } }),
    prisma.electricityBill.aggregate({ _sum: { amount: true }, where: { status: "PAID", buildingId } }),
    prisma.cleanerPaymentEntry.aggregate({
      _sum: { amount: true },
      where: { cleanerPayment: { cleaner: { buildingId } } },
    }),
    prisma.additionalCharge.findMany({
      where: { status: "UNPAID", ...flatInBuilding },
      include: { flat: { include: { floor: true } } },
    }),
    prisma.electricityBill.findMany({
      where: { status: "UNPAID", dueDate: { lt: now }, buildingId },
    }),
    loadTransactions(buildingId, { range: monthRange }),
    loadTransactions(buildingId, { take: 10 }),
    prisma.flat.findMany({
      where: { floor: { buildingId } },
      include: { payments: true, maintenanceRates: true },
    }),
  ]);

  const totalMaintenanceCollected = sumOf(maintenanceAgg);
  const totalAdditionalIncome = sumOf(chargesAgg);
  const totalIncome = totalMaintenanceCollected + totalAdditionalIncome;

  const totalExpenses = sumOf(expensesAgg);
  const totalElectricityPaid = sumOf(billsAgg);
  const totalCleanerSalaryPaid = sumOf(cleanerAgg);
  const totalOutgoing = totalExpenses + totalElectricityPaid + totalCleanerSalaryPaid;

  const openingBalance = Number(settings.openingBalance);
  const closingBalance = openingBalance + totalIncome - totalOutgoing;

  const ratesOf = (f: (typeof flats)[number]) =>
    f.maintenanceRates.map((r) => ({
      amount: Number(r.amount),
      effectiveMonth: r.effectiveMonth,
      effectiveYear: r.effectiveYear,
    }));
  const pendingMaintenanceThisMonth = flats
    .filter((f) => f.payments.find((p) => p.month === month && p.year === year)?.status !== "PAID")
    .reduce((sum, f) => sum + rateForMonth(ratesOf(f), month, year), 0);
  // Same calculation as the Total Dues report: every unpaid month up to now, carried forward.
  const pendingMaintenanceAllMonths = flats.reduce(
    (sum, f) =>
      sum +
      totalDue(
        buildDueSchedule(
          ratesOf(f),
          f.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
          now.getMonth() + 1,
          now.getFullYear(),
        ),
      ),
    0,
  );
  const pendingCharges = unpaidCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const outstandingDues = pendingMaintenanceAllMonths + pendingCharges;

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
    recentTransactions,
    overdueBills,
    overdueCharges: unpaidCharges.filter((c) => c.dueDate && c.dueDate < now),
  };
}
