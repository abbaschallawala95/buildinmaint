// Self-check for cleaner advances: money paid beyond a month's salary carries into later months.
// Usage: npx tsx scripts/check-cleaner-advance.ts
import assert from "node:assert";
import { cleanerMonth } from "../src/lib/cleaner-advance";

const rates = [{ amount: 1200, effectiveMonth: 1, effectiveYear: 2026 }];
const paid = (month: number, amount: number) => ({ month, year: 2026, amount });

// Jan paid 1400 → 200 extra; Feb starts with 200 already covered.
const payments = [paid(1, 600), paid(1, 600), paid(1, 200)];
assert.deepEqual(cleanerMonth(rates, payments, 1, 2026), { due: 1200, carriedIn: 0, paid: 1400, remaining: 0, carriedOut: 200, status: "PAID" });
assert.deepEqual(cleanerMonth(rates, payments, 2, 2026), { due: 1200, carriedIn: 200, paid: 0, remaining: 1000, carriedOut: 0, status: "PARTIAL" });

// A big advance covers several months: 3000 in Jan → Feb fully covered, 600 left for March.
const big = [paid(1, 3000)];
assert.equal(cleanerMonth(rates, big, 2, 2026).status, "PAID");
assert.deepEqual(cleanerMonth(rates, big, 3, 2026), { due: 1200, carriedIn: 600, paid: 0, remaining: 600, carriedOut: 0, status: "PARTIAL" });

// An underpaid month does not push extra due into the next month (it stays Partial on its own).
const short = [paid(1, 1000), paid(2, 1200)];
assert.deepEqual(cleanerMonth(rates, short, 2, 2026), { due: 1200, carriedIn: 0, paid: 1200, remaining: 0, carriedOut: 0, status: "PAID" });

// Credit is used up across a salary raise, and paying on top of credit carries the rest on.
const raised = [...rates, { amount: 1500, effectiveMonth: 3, effectiveYear: 2026 }];
assert.deepEqual(cleanerMonth(raised, [paid(2, 2000), paid(3, 1000)], 3, 2026), { due: 1500, carriedIn: 800, paid: 1000, remaining: 0, carriedOut: 300, status: "PAID" });

// Crosses the year end; no salary means nothing is due.
assert.equal(cleanerMonth(rates, [{ month: 12, year: 2026, amount: 1500 }], 1, 2027).carriedIn, 300);
assert.deepEqual(cleanerMonth([], [], 5, 2026), { due: 0, carriedIn: 0, paid: 0, remaining: 0, carriedOut: 0, status: "UNPAID" });
console.log("OK");
