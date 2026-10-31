import { rateForMonth } from "@/lib/rate-history";

type Rate = Parameters<typeof rateForMonth>[0][number];
type Paid = { month: number; year: number; amount: number };

// One month of a cleaner's salary, with advances carried forward: anything paid beyond a
// month's salary covers the next month(s). A short month is not carried; it stays Partial.
export function cleanerMonth(rates: Rate[], payments: Paid[], month: number, year: number) {
  const key = (m: number, y: number) => y * 12 + (m - 1);
  const target = key(month, year);
  const paidIn = new Map<number, number>();
  for (const p of payments) paidIn.set(key(p.month, p.year), (paidIn.get(key(p.month, p.year)) ?? 0) + p.amount);

  const start = Math.min(target, ...rates.map((r) => key(r.effectiveMonth, r.effectiveYear)), ...paidIn.keys());
  const dueAt = (k: number) => rateForMonth(rates, (k % 12) + 1, Math.floor(k / 12));

  let carriedIn = 0;
  for (let k = start; k < target; k++) carriedIn = Math.max(0, carriedIn + (paidIn.get(k) ?? 0) - dueAt(k));

  const due = dueAt(target);
  const paid = paidIn.get(target) ?? 0;
  const covered = carriedIn + paid;
  return {
    due,
    carriedIn,
    paid,
    remaining: Math.max(0, due - covered),
    carriedOut: Math.max(0, covered - due),
    status: covered <= 0 ? "UNPAID" : covered >= due ? "PAID" : "PARTIAL",
  } as const;
}
