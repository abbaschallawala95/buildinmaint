import { NextRequest } from "next/server";
import { requireAdminContext } from "@/lib/building-context";
import { MONTH_NAMES, SECTIONS, firstShownMonth, parsePeriod, parseSections } from "@/lib/analytics";
import { FIRST_YEAR, getAnalytics } from "@/lib/analytics-data";
import { buildExcelReport } from "@/lib/export/excel";
import { buildPdfReport } from "@/lib/export/pdf";

const rs = (n: number) => n.toFixed(2);
const short = (m: number) => MONTH_NAMES[m - 1].slice(0, 3);

// Same query string as /admin/analytics; exports the ticked sections as tables.
export async function GET(req: NextRequest) {
  let buildingId: string;
  try {
    ({ buildingId } = await requireAdminContext());
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") === "pdf" ? "pdf" : "excel";
  const now = new Date();
  const period = parsePeriod(searchParams.get("period"), FIRST_YEAR) ?? { year: now.getFullYear(), month: now.getMonth() + 1 };
  const compare = parsePeriod(searchParams.get("cmp"), FIRST_YEAR);
  const on = parseSections(searchParams.getAll("s"));
  const { year: a, comparison, collection } = await getAnalytics(buildingId, period, compare);
  const label = (p: { year: number; month: number }) => `${MONTH_NAMES[p.month - 1]} ${p.year}`;
  // Same months the page shows: empty ones before the first transaction are left out.
  const from = firstShownMonth(a, period.month) - 1;
  const shown = a.months.slice(from);
  const months = shown.map((m) => short(m.month));

  const sections: { heading: string; headers: string[]; rows: (string | number)[][]; colWeights?: number[] }[] = [];
  const title = (k: string) => SECTIONS.find((s) => s.key === k)!.label;

  if (on.includes("summary")) {
    sections.push({
      heading: `${title("summary")} ${period.year}`,
      headers: ["Metric", "Value"],
      rows: [
        ["Spent (Rs.)", rs(a.totalExpense)],
        ["Collected (Rs.)", rs(a.totalIncome)],
        ["Saved / short (Rs.)", rs(a.totalIncome - a.totalExpense)],
        ["Costliest month", a.costliestMonth ? MONTH_NAMES[a.costliestMonth - 1] : "-"],
      ],
    });
  }
  if (on.includes("chart")) {
    sections.push({
      heading: title("chart"),
      headers: ["Month", "Income (Rs.)", "Expenses (Rs.)", "Net (Rs.)"],
      rows: shown.map((m) => [MONTH_NAMES[m.month - 1], rs(m.income), rs(m.expense), rs(m.income - m.expense)]),
    });
  }
  if (on.includes("focus")) {
    sections.push({
      heading: `${label(period)} vs previous month`,
      headers: ["Expense", "This month (Rs.)", "Previous month (Rs.)", "Change (Rs.)", "Note"],
      rows: a.expenseHeads
        .map((h) => h.cells[period.month - 1])
        .map((c, i) => [a.expenseHeads[i].head, rs(c.amount), rs(c.amount - c.change), rs(c.change), c.isNew ? "Additional this month" : c.dropped ? "Not this month" : ""])
        .filter((r) => r[1] !== "0.00" || r[4] !== ""),
    });
  }
  if (on.includes("compare") && comparison && compare) {
    sections.push({
      heading: `${label(period)} vs ${label(compare)}`,
      headers: ["Head", "Type", `${label(compare)} (Rs.)`, `${label(period)} (Rs.)`, "Difference (Rs.)"],
      rows: comparison.rows.map((r) => [r.head, r.kind === "expense" ? "Expense" : "Income", rs(r.a), rs(r.b), rs(r.diff)]),
    });
  }
  for (const [key, heads] of [["expenses", a.expenseHeads], ["income", a.incomeHeads]] as const) {
    if (!on.includes(key)) continue;
    sections.push({
      heading: title(key),
      headers: [key === "expenses" ? "Expense" : "Income", ...months, "Total"],
      colWeights: [3, ...months.map(() => 1.2), 1.4],
      rows: heads.map((h) => [h.head, ...h.cells.slice(from).map((c) => (c.isNew ? `${c.amount} (new)` : c.amount)), h.total]),
    });
  }
  if (on.includes("collection")) {
    sections.push({
      heading: title("collection"),
      headers: ["Month", "Expected (Rs.)", "Collected (Rs.)", "Collected %", "Flats still to pay"],
      colWeights: [1.2, 1.2, 1.2, 1, 2.5],
      rows: collection.slice(from).map((c) => [
        MONTH_NAMES[c.month - 1],
        rs(c.expected),
        rs(c.collected),
        c.expected > 0 ? `${Math.round((c.collected / c.expected) * 100)}%` : "-",
        c.behind.join(", "),
      ]),
    });
  }

  const name = `Analytics - ${label(period)}${compare ? ` vs ${label(compare)}` : ""}`;
  const filename = `analytics-${period.year}-${String(period.month).padStart(2, "0")}`;
  if (format === "pdf") {
    const buffer = await buildPdfReport(name, sections);
    return new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"` },
    });
  }
  const buffer = await buildExcelReport(sections.map((s) => ({ sheetName: s.heading.replace(/[\\/?*[\]:]/g, "-"), headers: s.headers, rows: s.rows })));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}
