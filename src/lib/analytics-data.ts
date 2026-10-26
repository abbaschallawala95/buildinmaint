import "server-only";
import { prisma } from "@/lib/prisma";
import { getYearTransactions } from "@/lib/finance";
import { rateForMonth } from "@/lib/rate-history";
import { buildYearAnalytics, compareMonths, type Period } from "@/lib/analytics";

export const FIRST_YEAR = 2026;

// Everything the analytics sections need for one building, `period` selected, optional comparison.
export async function getAnalytics(buildingId: string, period: Period, compare: Period | null) {
  const now = new Date();
  const lastMonth = period.year === now.getFullYear() ? now.getMonth() + 1 : 12;
  const [yearTxns, compareTxns, flats] = await Promise.all([
    getYearTransactions(buildingId, period.year),
    compare && compare.year !== period.year ? getYearTransactions(buildingId, compare.year) : null,
    prisma.flat.findMany({
      where: { floor: { buildingId }, maintenanceRates: { some: {} } },
      orderBy: [{ floor: { sortOrder: "asc" } }, { flatNumber: "asc" }],
      include: {
        floor: true,
        maintenanceRates: true,
        payments: { where: { year: period.year, status: "PAID" } },
      },
    }),
  ]);

  const year = buildYearAnalytics(yearTxns, period.year, lastMonth);
  const comparison = compare ? compareMonths([...yearTxns, ...(compareTxns ?? [])], compare, period) : null;

  // Maintenance expected (each flat's rate that month) vs collected (PAID for that month).
  const collection = year.months.map(({ month }) => {
    let expected = 0;
    let collected = 0;
    const behind: string[] = [];
    for (const f of flats) {
      const rate = rateForMonth(
        f.maintenanceRates.map((r) => ({ amount: Number(r.amount), effectiveMonth: r.effectiveMonth, effectiveYear: r.effectiveYear })),
        month,
        period.year,
      );
      if (rate <= 0) continue;
      expected += rate;
      const paid = f.payments.find((p) => p.month === month);
      if (paid) collected += Number(paid.amount);
      else behind.push(`${f.floor.name} / ${f.flatNumber}`);
    }
    return { month, expected, collected, behind };
  });

  return { period, compare, year, comparison, collection };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;
