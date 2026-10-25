// Parses an <input type="month"> value ("YYYY-MM") into the month a rate change takes
// effect from; blank or malformed falls back to the current month.
export function parseEffectiveFrom(value: FormDataEntryValue | null): { month: number; year: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value ?? ""));
  const month = Number(match?.[2]);
  if (match && month >= 1 && month <= 12 && Number(match[1]) >= 2000) {
    return { month, year: Number(match[1]) };
  }
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

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
