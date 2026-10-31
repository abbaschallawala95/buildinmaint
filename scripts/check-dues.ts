// Self-check for the dues schedule behind Outstanding Dues and the Total Dues report.
// Usage: npx tsx scripts/check-dues.ts
import assert from "node:assert";
import { buildDueSchedule, totalDue, splitUnpaidCharges, paymentState } from "../src/lib/maintenance-dues";
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

// An UNPAID payment row is still due; paying less than the rate leaves the rest due (Partial).
const s2 = buildDueSchedule(rates, [{ ...paid(11, 2025, 800) }, { ...paid(12, 2025, 1000), status: "UNPAID" }], 12, 2025);
assert.equal(totalDue(s2), 200 + 1000, "UNPAID row counts as due, plus what a short month still owes");
assert.equal(s2[0].amount, 800, "a PAID month shows what was actually paid");
assert.equal(s2[0].status, "PARTIAL");

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
// Partial payments: 100 paid against 600 leaves 500 due; the remainder shows in dues.
assert.deepEqual(paymentState(600, { status: "PAID", amount: 100 }), { paid: 100, remaining: 500, status: "PARTIAL" });
assert.deepEqual(paymentState(600, { status: "PAID", amount: 600 }), { paid: 600, remaining: 0, status: "PAID" });
assert.deepEqual(paymentState(600, { status: "PAID", amount: 700 }), { paid: 700, remaining: 0, status: "PAID" });
assert.deepEqual(paymentState(600, undefined), { paid: 0, remaining: 600, status: "UNPAID" });
assert.deepEqual(paymentState(600, { status: "UNPAID", amount: 0 }), { paid: 0, remaining: 600, status: "UNPAID" });
const r600 = [{ amount: 600, effectiveMonth: 1, effectiveYear: 2026 }];
const partial = buildDueSchedule(r600, [{ ...paid(1, 2026, 100) }, { ...paid(2, 2026, 600) }], 3, 2026);
assert.deepEqual(partial.map((s) => s.status), ["PARTIAL", "PAID", "UNPAID"]);
assert.deepEqual(partial.map((s) => s.remaining), [500, 0, 600]);
assert.equal(totalDue(partial), 1100, "partial remainder + unpaid month");
console.log("OK");
