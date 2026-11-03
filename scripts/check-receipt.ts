// Self-check: member phone numbers, however they were typed, become a valid wa.me link, and
// receipt numbers and dates print the way the receipt shows them.
// Usage: npx tsx scripts/check-receipt.ts
import assert from "node:assert";
import { receiptDate, receiptNumber, whatsappLink, whatsappNumber } from "../src/lib/receipt";

assert.equal(whatsappNumber("9876543210"), "919876543210");
assert.equal(whatsappNumber("098765 43210"), "919876543210");
assert.equal(whatsappNumber("+91 98765-43210"), "919876543210");
assert.equal(whatsappNumber("+1 415 555 2671"), "14155552671");
assert.equal(whatsappNumber(null), "");
assert.equal(whatsappNumber("12345"), "", "too short to be a number");
assert.equal(whatsappLink("9876543210"), "https://wa.me/919876543210");

assert.equal(receiptNumber(1), "0001");
assert.equal(receiptNumber(12345), "12345", "never cut a number past 9999");

assert.equal(receiptDate(new Date("2026-11-03")), "3/11/2026");
assert.equal(receiptDate(null), null);
console.log("OK");
