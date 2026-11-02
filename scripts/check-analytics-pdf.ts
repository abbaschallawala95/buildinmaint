// Self-check: the Analytics PDF draws every section without crashing on awkward data
// (non-WinAnsi names, very long names, no data at all), honours the ticked sections,
// and long tables run onto more pages.
// Usage: npx tsx --conditions=react-server scripts/check-analytics-pdf.ts
import assert from "node:assert";
import { PDFDocument } from "pdf-lib";
import { SECTIONS, buildYearAnalytics, compareMonths } from "../src/lib/analytics";
import { buildAnalyticsPdf } from "../src/lib/export/analytics-pdf";

const ALL = SECTIONS.map((s) => s.key);
const pagesOf = async (pdf: Buffer) => {
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  return (await PDFDocument.load(pdf)).getPageCount();
};

function dataWith(heads: string[], month: number) {
  const period = { year: 2026, month };
  const compare = { year: 2026, month: Math.max(1, month - 2) };
  const txns = heads.flatMap((head, i) =>
    Array.from({ length: month }, (_, m) => [
      { date: new Date(2026, m, 5), head, amount: i % 3 === m % 3 ? 0 : 1000 * (m + 1) + i, kind: "expense" as const },
      { date: new Date(2026, m, 6), head: `${head} income`, amount: 123456 + m, kind: "income" as const },
    ]).flat(),
  );
  const year = buildYearAnalytics(txns, 2026, month);
  return {
    period,
    compare,
    year,
    comparison: compareMonths(txns, compare, period),
    collection: year.months.map((m) => ({ month: m.month, expected: 1000, collected: m.month * 80, behind: heads.slice(0, 30).map((h) => `Floor / ${h.slice(0, 12)}`) })),
  };
}

async function main() {
  const awkward = ["Lift ₹ रिपोर्ट", "Supercalifragilisticexpialidocious very long expense name that must wrap inside its column", "Zoë 🏠 “Quotes”"];
  const full = await buildAnalyticsPdf(dataWith(awkward, 11), ALL, "Test ₹ Building");
  assert.ok((await pagesOf(full)) >= 1);

  const many = Array.from({ length: 60 }, (_, i) => `Expense head ${i + 1}`);
  assert.ok((await pagesOf(await buildAnalyticsPdf(dataWith(many, 12), ["expenses"], "B"))) > 1, "long table runs onto more pages");

  const only = await buildAnalyticsPdf(dataWith(awkward, 3), ["summary"], "B");
  assert.ok(only.length < full.length, "only the ticked sections are drawn");

  const empty = { period: { year: 2026, month: 1 }, compare: null, comparison: null, year: buildYearAnalytics([], 2026, 1), collection: [{ month: 1, expected: 0, collected: 0, behind: [] }] };
  assert.ok((await pagesOf(await buildAnalyticsPdf(empty, ALL, "B"))) >= 1);
  console.log("OK");
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
