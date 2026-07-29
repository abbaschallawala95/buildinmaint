import "server-only";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export type Transaction = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  kind: "income" | "expense";
};

export async function getFinancialOverview() {
  const [settings, paidPayments, paidCharges, expenses, paidBills, unpaidCharges, overdueBills] =
    await Promise.all([
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
  const totalOutgoing = totalExpenses + totalElectricityPaid;

  const openingBalance = Number(settings.openingBalance);
  const closingBalance = openingBalance + totalIncome - totalOutgoing;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const flatsUnpaidThisMonth = await prisma.flat.findMany({
    include: { payments: { where: { month, year } }, floor: true },
  });
  const pendingMaintenanceThisMonth = flatsUnpaidThisMonth
    .filter((f) => f.payments[0]?.status !== "PAID")
    .reduce((sum, f) => sum + Number(f.monthlyMaintenanceAmount), 0);
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
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    settings,
    totalMaintenanceCollected,
    totalAdditionalIncome,
    totalIncome,
    totalExpenses,
    totalElectricityPaid,
    totalOutgoing,
    openingBalance,
    closingBalance,
    outstandingDues,
    pendingMaintenanceThisMonth,
    pendingCharges,
    recentTransactions: transactions.slice(0, 10),
    overdueBills,
    overdueCharges: unpaidCharges.filter((c) => c.dueDate && c.dueDate < now),
  };
}
