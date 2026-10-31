import { rateForMonth } from "@/lib/rate-history";

export type PaymentStatusLabel = "PAID" | "PARTIAL" | "UNPAID";

export type MonthlyDue = {
  month: number;
  year: number;
  /** what was paid if anything was, otherwise the rate */
  amount: number;
  /** that month's rate */
  rate: number;
  paid: number;
  remaining: number;
  status: PaymentStatusLabel;
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

// One month's maintenance against its rate: a PAID row for less than the rate is Partial and
// the rest is still due. Every screen that shows paid/unpaid goes through this.
export function paymentState(
  rate: number,
  payment: { status: string; amount: number | { toString(): string } } | undefined,
): { paid: number; remaining: number; status: PaymentStatusLabel } {
  const paid = payment?.status === "PAID" ? Number(payment.amount) : 0;
  const remaining = Math.max(0, rate - paid);
  return { paid, remaining, status: paid <= 0 ? "UNPAID" : remaining > 0 ? "PARTIAL" : "PAID" };
}

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
    const rate = rateForMonth(rateHistory, month, year);
    const state = paymentState(rate, payment);
    const recorded = state.status !== "UNPAID";
    schedule.push({
      month,
      year,
      amount: recorded ? state.paid : rate,
      rate,
      ...state,
      paymentDate: recorded ? (payment?.paymentDate ?? null) : null,
      paymentMethod: recorded ? (payment?.paymentMethod ?? null) : null,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return schedule;
}

export function totalDue(schedule: MonthlyDue[]): number {
  return schedule.reduce((sum, s) => sum + s.remaining, 0);
}

// Unpaid additional charges split into previous (pre-app) dues and everything else.
export function splitUnpaidCharges(
  charges: { amount: number | { toString(): string }; status: string; previousDueType: string | null }[],
): { previous: number; other: number } {
  const split = { previous: 0, other: 0 };
  for (const c of charges) {
    if (c.status === "PAID") continue;
    split[c.previousDueType ? "previous" : "other"] += Number(c.amount);
  }
  return split;
}
