// Self-check for the Total Dues report: every item a flat owes is listed with its own name,
// part-paid months included, and the totals add up.
// Usage: npx tsx scripts/check-dues-report.ts
import assert from "node:assert";
import { buildDuesReport } from "../src/lib/dues-report";

const flat = {
  label: "Floor 1 / A-101",
  member: "Test Member",
  rates: [{ amount: 600, effectiveMonth: 9, effectiveYear: 2026 }],
  payments: [
    { month: 9, year: 2026, status: "PAID", amount: 600, paymentDate: null, paymentMethod: null },
    { month: 10, year: 2026, status: "PAID", amount: 300, paymentDate: null, paymentMethod: null },
  ],
  charges: [
    { description: "Maintenance dues 2025", amount: 9000, previousDueType: "MAINTENANCE" },
    { description: "Water tank cleaning share 2025", amount: 400, previousDueType: "OTHER" },
    { description: "Lift repair share", amount: 250, previousDueType: null },
  ],
};
const clear = { ...flat, label: "Floor 1 / A-102", payments: [], rates: [], charges: [] };

const r = buildDuesReport([flat, clear], 11, 2026);

const a = r.flats[0];
assert.deepEqual(
  a.items.map((i) => [i.kind, i.label, i.due]),
  [
    ["MONTHLY", "Oct 2026", 300],
    ["MONTHLY", "Nov 2026", 600],
    ["PREVIOUS_MAINTENANCE", "Maintenance dues 2025", 9000],
    ["OTHER", "Water tank cleaning share 2025", 400],
    ["OTHER", "Lift repair share", 250],
  ],
);
assert.equal(a.items[0].note, "Partial: 300 paid of 600");
assert.equal(a.items[1].note, "Unpaid");
assert.deepEqual([a.monthly, a.previousMaintenance, a.other, a.total], [900, 9000, 650, 10550]);

assert.equal(r.flats[1].total, 0, "a flat with nothing due is still listed, as clear");

assert.deepEqual(r.totals, {
  unpaidMonths: 600,
  partialMonths: 300,
  previousMaintenance: 9000,
  other: [
    { name: "Water tank cleaning share 2025", amount: 400 },
    { name: "Lift repair share", amount: 250 },
  ],
  grand: 10550,
  flatsWithDues: 1,
});
console.log("OK");
