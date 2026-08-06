import { rateForMonth } from "@/lib/rate-history";

export type MonthlyDue = {
  month: number;
  year: number;
  amount: number;
  status: "PAID" | "UNPAID";
  paymentDate: Date | null;
  paymentMethod: string | null;
};

type RateRow = { amount: number; effectiveMonth: number; effectiveYear: number };
type PaymentRow = {
  month: number;
  year: number;
  status: string;
  amount: number;
  paymentDate: Date | null;
  paymentMethod: string | null;
};

// Builds one row per month from the flat's earliest rate history entry through the given
// month/year (inclusive), so a member can see every due month since the flat started — not
// just the ones that happen to have a payment row.
export function buildDueSchedule(
  rateHistory: RateRow[],
  payments: PaymentRow[],
  uptoMonth: number,
  uptoYear: number,
): MonthlyDue[] {
  if (rateHistory.length === 0) return [];

  const start = rateHistory.reduce((earliest, h) =>
    h.effectiveYear < earliest.effectiveYear ||
    (h.effectiveYear === earliest.effectiveYear && h.effectiveMonth < earliest.effectiveMonth)
      ? h
      : earliest,
  );

  const paymentByPeriod = new Map(payments.map((p) => [`${p.month}-${p.year}`, p]));

  const schedule: MonthlyDue[] = [];
  let month = start.effectiveMonth;
  let year = start.effectiveYear;
  while (year < uptoYear || (year === uptoYear && month <= uptoMonth)) {
    const payment = paymentByPeriod.get(`${month}-${year}`);
    if (payment?.status === "PAID") {
      schedule.push({
        month,
        year,
        amount: payment.amount,
        status: "PAID",
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
      });
    } else {
      schedule.push({
        month,
        year,
        amount: rateForMonth(rateHistory, month, year),
        status: "UNPAID",
        paymentDate: null,
        paymentMethod: null,
      });
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return schedule;
}

export function totalDue(schedule: MonthlyDue[]): number {
  return schedule.filter((s) => s.status === "UNPAID").reduce((sum, s) => sum + s.amount, 0);
}
