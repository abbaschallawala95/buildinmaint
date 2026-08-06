// Resolves the rate that was/is in effect for a given month, from a rate-change history
// (used for both cleaner salaries and flat maintenance amounts).
export function rateForMonth(
  history: { amount: number; effectiveMonth: number; effectiveYear: number }[],
  month: number,
  year: number,
): number {
  const sorted = [...history].sort((a, b) =>
    a.effectiveYear !== b.effectiveYear ? a.effectiveYear - b.effectiveYear : a.effectiveMonth - b.effectiveMonth,
  );
  let applicable = sorted[0]?.amount ?? 0;
  for (const h of sorted) {
    if (h.effectiveYear < year || (h.effectiveYear === year && h.effectiveMonth <= month)) {
      applicable = h.amount;
    }
  }
  return applicable;
}
