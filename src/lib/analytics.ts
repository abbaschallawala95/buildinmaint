// Analytics folds for the admin Analytics page and shared member reports: month totals,
// head × month grids, month-vs-month comparison, plus section/period parsing.
// Pure (no DB) so scripts/check-analytics.ts can test it.

type Kind = "income" | "expense";
type Tx = { date: Date; head: string; amount: number; kind: Kind };
export type Period = { year: number; month: number };

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const SECTIONS = [
  { key: "summary", label: "Year summary" },
  { key: "chart", label: "Money in vs out" },
  { key: "focus", label: "Month vs previous" },
  { key: "compare", label: "Compare two months" },
  { key: "expenses", label: "Expense table" },
  { key: "income", label: "Income table" },
  { key: "collection", label: "Collection rate" },
] as const;
export type SectionKey = (typeof SECTIONS)[number]["key"];

// Known keys in the canonical order; nothing given means every section.
export function parseSections(values: readonly string[]): SectionKey[] {
  const picked = SECTIONS.map((s) => s.key).filter((k) => values.includes(k));
  return picked.length > 0 ? picked : SECTIONS.map((s) => s.key);
}

// Every month from January of `firstYear` up to now, newest first.
export function periodOptions(firstYear: number, now = new Date()) {
  const options: (Period & { value: string; label: string })[] = [];
  for (let y = now.getFullYear(); y >= firstYear; y--) {
    for (let m = y === now.getFullYear() ? now.getMonth() + 1 : 12; m >= 1; m--) {
      options.push({ value: `${y}-${String(m).padStart(2, "0")}`, label: `${MONTH_NAMES[m - 1]} ${y}`, year: y, month: m });
    }
  }
  return options;
}

export function parsePeriod(value: string | null | undefined, firstYear: number, now = new Date()): Period | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const period = { year: Number(match[1]), month: Number(match[2]) };
  return periodOptions(firstYear, now).some((o) => o.year === period.year && o.month === period.month) ? period : null;
}

export type HeadCell = {
  month: number;
  amount: number;
  /** amount − previous month's amount (January compares with the previous December) */
  change: number;
  /** received/spent this month, nothing the month before */
  isNew: boolean;
  /** received/spent the month before, nothing this month */
  dropped: boolean;
};
export type HeadRow = { head: string; cells: HeadCell[]; total: number };

export function buildYearAnalytics(transactions: Tx[], year: number, lastMonth: number) {
  const months = Array.from({ length: lastMonth }, (_, i) => ({ month: i + 1, income: 0, expense: 0 }));
  // kind → head → amount per month, index 0 = December of the previous year
  const byHead = { income: new Map<string, number[]>(), expense: new Map<string, number[]>() };

  for (const t of transactions) {
    const y = t.date.getFullYear();
    const m = t.date.getMonth() + 1;
    const index = y === year ? m : y === year - 1 && m === 12 ? 0 : -1;
    if (index < 0 || index > lastMonth) continue;
    if (index > 0) months[index - 1][t.kind] += t.amount;
    const row = byHead[t.kind].get(t.head) ?? Array(lastMonth + 1).fill(0);
    row[index] += t.amount;
    byHead[t.kind].set(t.head, row);
  }

  const rows = (kind: Kind): HeadRow[] =>
    [...byHead[kind]]
      .map(([head, row]) => ({
        head,
        cells: months.map(({ month }): HeadCell => {
          const amount = row[month];
          const previous = row[month - 1];
          return { month, amount, change: amount - previous, isNew: amount > 0 && previous === 0, dropped: amount === 0 && previous > 0 };
        }),
        total: row.slice(1).reduce((s, v) => s + v, 0),
      }))
      .filter((h) => h.total > 0 || h.cells.some((c) => c.dropped))
      .sort((a, b) => b.total - a.total);

  const costliest = months.reduce((best, m) => (m.expense > best.expense ? m : best), months[0]);
  return {
    months,
    expenseHeads: rows("expense"),
    incomeHeads: rows("income"),
    totalIncome: months.reduce((s, m) => s + m.income, 0),
    totalExpense: months.reduce((s, m) => s + m.expense, 0),
    costliestMonth: costliest && costliest.expense > 0 ? costliest.month : null,
  };
}

export type YearAnalytics = ReturnType<typeof buildYearAnalytics>;

// Per-head amounts of two months side by side; diff = b − a.
export function compareMonths(transactions: Tx[], a: Period, b: Period) {
  const key = (p: Period) => p.year * 12 + p.month;
  const ka = key(a);
  const kb = key(b);
  const byHead = new Map<string, { head: string; kind: Kind; a: number; b: number }>();
  const totals = { income: { a: 0, b: 0 }, expense: { a: 0, b: 0 } };

  for (const t of transactions) {
    const k = t.date.getFullYear() * 12 + t.date.getMonth() + 1;
    const side = k === ka ? "a" : k === kb ? "b" : null;
    if (!side) continue;
    const id = `${t.kind}:${t.head}`;
    const row = byHead.get(id) ?? { head: t.head, kind: t.kind, a: 0, b: 0 };
    row[side] += t.amount;
    byHead.set(id, row);
    totals[t.kind][side] += t.amount;
  }

  const rows = [...byHead.values()]
    .map((r) => ({ ...r, diff: r.b - r.a }))
    .sort((x, y) => (x.kind === y.kind ? Math.max(y.a, y.b) - Math.max(x.a, x.b) : x.kind === "expense" ? -1 : 1));
  return { rows, totals };
}

export type MonthComparison = ReturnType<typeof compareMonths>;

// First month worth showing: empty months before the year's first transaction are skipped,
// but never past the selected month.
export function firstShownMonth(year: YearAnalytics, selectedMonth: number) {
  const firstActive = year.months.find((m) => m.income > 0 || m.expense > 0)?.month ?? selectedMonth;
  return Math.min(firstActive, selectedMonth);
}
