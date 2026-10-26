// Self-check for analytics: month totals, per-head changes, "New" heads, month comparison,
// section and period parsing.
// Usage: npx tsx scripts/check-analytics.ts
import assert from "node:assert";
import { SECTIONS, buildYearAnalytics, compareMonths, parsePeriod, parseSections, periodOptions } from "../src/lib/analytics";

const tx = (y: number, m: number, head: string, amount: number, kind: "income" | "expense" = "expense") => ({
  date: new Date(y, m - 1, 10),
  head,
  amount,
  kind,
});

const txns = [
  tx(2025, 12, "Lift Electricity Bill", 40), // previous December: baseline for January
  tx(2026, 1, "Lift Electricity Bill", 50),
  tx(2026, 2, "Lift Electricity Bill", 30),
  tx(2026, 2, "Plumbing Work", 450),
  tx(2026, 2, "Plumbing Work", 50),
  tx(2026, 3, "Lift Electricity Bill", 30),
  tx(2026, 1, "Maintenance", 1000, "income"),
  tx(2026, 3, "Maintenance", 1200, "income"),
  tx(2026, 3, "Festival contribution", 300, "income"),
];
const a = buildYearAnalytics(txns, 2026, 3);

assert.deepEqual(a.months.map((m) => m.expense), [50, 530, 30]);
assert.deepEqual(a.months.map((m) => m.income), [1000, 0, 1500]);
assert.equal(a.totalExpense, 610);
assert.equal(a.totalIncome, 2500);
assert.equal(a.costliestMonth, 2);

const lift = a.expenseHeads.find((h) => h.head === "Lift Electricity Bill")!;
assert.deepEqual(lift.cells.map((c) => c.change), [10, -20, 0], "change vs previous month, Jan vs last Dec");
assert.ok(lift.cells.every((c) => !c.isNew));
assert.equal(lift.total, 110);

const plumbing = a.expenseHeads.find((h) => h.head === "Plumbing Work")!;
assert.deepEqual(plumbing.cells.map((c) => c.amount), [0, 500, 0], "same head in one month is summed");
assert.equal(plumbing.cells[1].isNew, true, "nothing the month before → New");
assert.equal(plumbing.cells[2].dropped, true, "spent last month, nothing now → dropped");
assert.equal(a.expenseHeads[0].head, "Plumbing Work", "heads sorted by year total, largest first");
assert.ok(!a.expenseHeads.some((h) => h.head === "Maintenance"), "income heads are not in the expense grid");

const maintenance = a.incomeHeads.find((h) => h.head === "Maintenance")!;
assert.deepEqual(maintenance.cells.map((c) => c.amount), [1000, 0, 1200]);
assert.equal(maintenance.cells[2].isNew, true);
assert.equal(a.incomeHeads.find((h) => h.head === "Festival contribution")!.cells[2].isNew, true);

// Compare any two months, across years too.
const cmp = compareMonths(txns, { year: 2025, month: 12 }, { year: 2026, month: 2 });
const liftRow = cmp.rows.find((r) => r.head === "Lift Electricity Bill")!;
assert.deepEqual([liftRow.a, liftRow.b, liftRow.diff], [40, 30, -10]);
assert.deepEqual(cmp.rows.find((r) => r.head === "Plumbing Work")!.a, 0);
assert.deepEqual(cmp.totals, { income: { a: 0, b: 0 }, expense: { a: 40, b: 530 } });

// Sections: unknown keys dropped; none given → all.
assert.deepEqual(parseSections(["chart", "bogus", "income"]), ["chart", "income"]);
assert.deepEqual(parseSections([]), SECTIONS.map((s) => s.key));

// Periods: 2026 → now, newest first; out-of-range → null.
const now = new Date(2027, 1, 15); // 15 Feb 2027
const options = periodOptions(2026, now);
assert.equal(options.length, 14);
assert.deepEqual(options[0], { value: "2027-02", label: "February 2027", year: 2027, month: 2 });
assert.equal(options.at(-1)!.value, "2026-01");
assert.deepEqual(parsePeriod("2026-05", 2026, now), { year: 2026, month: 5 });
for (const bad of ["2027-03", "2025-12", "2026-13", "garbage", undefined]) assert.equal(parsePeriod(bad, 2026, now), null, String(bad));

console.log("OK");
