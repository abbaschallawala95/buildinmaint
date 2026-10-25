// Self-check: PDF export must not crash on non-WinAnsi text (Hindi, ₹, emoji), and wrapped
// cell text must fit its column.
// Usage: npx tsx --conditions=react-server scripts/check-pdf.ts
import assert from "node:assert";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildPdfReport, wrap } from "../src/lib/export/pdf";

async function main() {
  const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  const periods = "Jan 2026, Feb 2026, Mar 2026, Apr 2026, May 2026, Jun 2026, Jul 2026, Aug 2026, Sep 2026, Oct 2026";
  for (const text of [periods, "Supercalifragilisticexpialidocious-Apartments", "", "A-101"]) {
    const lines = wrap(text, font, 60);
    for (const l of lines) assert.ok(font.widthOfTextAtSize(l, 9) <= 60, `"${l}" overflows`);
    assert.equal(lines.join("").replace(/\s/g, ""), text.replace(/\s/g, ""), "text lost while wrapping");
  }

  const pdf = await buildPdfReport("Report ₹ रिपोर्ट", [
    {
      heading: "Dues — शर्मा",
      headers: ["Flat", "Member", "Months Unpaid", "Unpaid Periods", "Amount (₹)"],
      rows: [["A-101", "राजेश शर्मा", 10, periods, "₹1,500"], ["B-2", "Zoë 🏠 “Quotes”", 0, "-", 0]],
      colWeights: [1, 1.2, 0.8, 2.4, 1],
    },
  ]);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  console.log(`OK: ${pdf.length} bytes`);
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
