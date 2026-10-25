// Self-check for rate history: back-dated corrections and the "Effective From" parser.
// Usage: npx tsx scripts/check-rates.ts
import assert from "node:assert";
import { parseEffectiveFrom, rateForMonth } from "../src/lib/rate-history";

assert.deepEqual(parseEffectiveFrom("2025-03"), { month: 3, year: 2025 });
const now = new Date();
const thisMonth = { month: now.getMonth() + 1, year: now.getFullYear() };
for (const bad of [null, "", "2025-13", "2025-00", "1999-05", "garbage"]) {
  assert.deepEqual(parseEffectiveFrom(bad), thisMonth, `fallback for ${bad}`);
}

// Rate 1000 from Jan 2025, raised to 1500 from Jan 2026; then Mar 2025 corrected to 1200.
const history = [
  { amount: 1000, effectiveMonth: 1, effectiveYear: 2025 },
  { amount: 1500, effectiveMonth: 1, effectiveYear: 2026 },
  { amount: 1200, effectiveMonth: 3, effectiveYear: 2025 },
];
assert.equal(rateForMonth(history, 2, 2025), 1000, "before the correction keeps the old rate");
assert.equal(rateForMonth(history, 3, 2025), 1200, "correction applies from its month");
assert.equal(rateForMonth(history, 12, 2025), 1200, "correction runs until the next change");
assert.equal(rateForMonth(history, 1, 2026), 1500, "later change still wins");
console.log("OK");
