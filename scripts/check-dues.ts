// Self-check for the dues schedule behind Outstanding Dues and the Total Dues report.
// Usage: npx tsx scripts/check-dues.ts
import assert from "node:assert";
import { buildDueSchedule, totalDue, splitUnpaidCharges } from "../src/lib/maintenance-dues";
import { monthParam } from "../src/lib/utils";

const rates = [
  { amount: 1000, effectiveMonth: 11, effectiveYear: 2025 },
  { amount: 1500, effectiveMonth: 2, effectiveYear: 2026 },
];
const paid = (month: number, year: number, amount: number) => ({
  month, year, amount, status: "PAID", paymentDate: new Date(), paymentMethod: "CASH",
});

// Nov 2025 .. Apr 2026 = 6 months; Nov-Jan at 1000, Feb-Apr at 1500.
const schedule = buildDueSchedule(rates, [paid(12, 2025, 1000), paid(3, 2026, 1500)], 4, 2026);
assert.equal(schedule.length, 6, "one row per month from the first rate up to the given month");
assert.deepEqual(
  schedule.filter((s) => s.status === "UNPAID").map((s) => `${s.month}/${s.year}`),
  ["11/2025", "1/2026", "2/2026", "4/2026"],
  "unpaid months carry forward across the year boundary",
);
assert.equal(totalDue(schedule), 1000 + 1000 + 1500 + 1500, "each unpaid month uses its own rate");

// An UNPAID payment row is still due; a paid amount different from the rate is kept as paid.
const s2 = buildDueSchedule(rates, [{ ...paid(11, 2025, 800) }, { ...paid(12, 2025, 1000), status: "UNPAID" }], 12, 2025);
assert.equal(totalDue(s2), 1000, "UNPAID row counts as due");
assert.equal(s2[0].amount, 800, "a PAID month shows what was actually paid");

assert.deepEqual(buildDueSchedule([], [], 4, 2026), [], "a flat with no rate history owes nothing");

assert.equal(monthParam("3"), 3);
for (const bad of ["13", "0", "abc", "", null, undefined, "2.5"]) {
  assert.equal(monthParam(bad), new Date().getMonth() + 1, `monthParam(${bad}) falls back to this month`);
}
// Unpaid charges split into previous dues and other charges; paid ones are ignored.
const split = splitUnpaidCharges([
  { amount: 6000, status: "UNPAID", previousDueType: "MAINTENANCE" },
  { amount: 500, status: "UNPAID", previousDueType: "OTHER" },
  { amount: 900, status: "PAID", previousDueType: "MAINTENANCE" },
  { amount: 300, status: "UNPAID", previousDueType: null },
  { amount: 200, status: "PAID", previousDueType: null },
]);
assert.deepEqual(split, { previous: 6500, other: 300 });
console.log("OK");
