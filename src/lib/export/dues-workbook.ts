import "server-only";
import ExcelJS from "exceljs";
import type { DuesReport } from "@/lib/dues-report";

// Styled Total Dues workbook: Summary (per flat), Details (every item), Totals (by type).

const INK = "FF1F2937";
const BRAND = "FF4F46E5"; // indigo header / title bar
const BRAND_SOFT = "FFEEF2FF";
const STRIPE = "FFF8FAFC";
const LINE = "FFE2E8F0";
const DUE = "FFB91C1C"; // amount still owed
const CLEAR = "FF15803D";
const MONEY = '"₹"#,##0.00';
const KIND_LABEL = { MONTHLY: "Monthly maintenance", PREVIOUS_MAINTENANCE: "Previous dues — maintenance", OTHER: "Other dues" } as const;

const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const thin = { style: "thin" as const, color: { argb: LINE } };

function banner(ws: ExcelJS.Worksheet, cols: number, title: string, subtitle: string) {
  ws.mergeCells(1, 1, 1, cols);
  ws.mergeCells(2, 1, 2, cols);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  t.fill = fill(BRAND);
  t.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(1).height = 30;
  const s = ws.getCell(2, 1);
  s.value = subtitle;
  s.font = { size: 10, color: { argb: "FF475569" } };
  s.fill = fill(BRAND_SOFT);
  s.alignment = { indent: 1 };
  ws.getRow(2).height = 18;
}

function header(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = fill(BRAND);
    c.alignment = { vertical: "middle", wrapText: true };
    c.border = { bottom: thin };
  });
  row.height = 22;
}

function body(row: ExcelJS.Row, stripe: boolean) {
  row.eachCell({ includeEmpty: true }, (c) => {
    if (stripe) c.fill = fill(STRIPE);
    c.border = { bottom: thin };
    c.font = { ...c.font, color: c.font?.color ?? { argb: INK } };
  });
}

function total(row: ExcelJS.Row) {
  row.eachCell({ includeEmpty: true }, (c) => {
    c.font = { bold: true, color: { argb: INK } };
    c.fill = fill(BRAND_SOFT);
    c.border = { top: { style: "medium", color: { argb: BRAND } } };
  });
}

function money(cell: ExcelJS.Cell, value: number, highlight = true) {
  cell.value = value;
  cell.numFmt = MONEY;
  cell.alignment = { horizontal: "right" };
  if (highlight && value > 0) cell.font = { ...cell.font, color: { argb: DUE } };
}

export async function buildDuesWorkbook(report: DuesReport, buildingName: string, asOf: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Build Maintain";
  const subtitle = `${buildingName} · dues up to ${asOf}`;
  const { totals } = report;
  const otherTotal = totals.other.reduce((s, o) => s + o.amount, 0);

  // 1. Summary
  const sum = wb.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 8, showGridLines: false }] });
  sum.columns = [{ width: 22 }, { width: 22 }, { width: 20 }, { width: 22 }, { width: 18 }, { width: 18 }];
  banner(sum, 6, "Total Dues Report", subtitle);
  const kpis: [string, number | string][] = [
    ["Total due", totals.grand],
    ["Flats with dues", `${totals.flatsWithDues} of ${report.flats.length}`],
    ["Maintenance due", totals.unpaidMonths + totals.partialMonths + totals.previousMaintenance],
    ["Other dues", otherTotal],
  ];
  kpis.forEach(([label, value], i) => {
    const col = i === 0 ? 1 : i + 2; // spread over the row
    const l = sum.getCell(4, col);
    l.value = label;
    l.font = { size: 9, color: { argb: "FF64748B" } };
    const v = sum.getCell(5, col);
    if (typeof value === "number") money(v, value, false);
    else v.value = value;
    v.font = { bold: true, size: 14, color: { argb: i === 0 ? DUE : INK } };
    v.alignment = { horizontal: "left" };
  });
  const sh = sum.getRow(8);
  sh.values = ["Flat", "Member", "Monthly maintenance", "Previous maintenance dues", "Other dues", "Total due"];
  header(sh);
  report.flats.forEach((f, i) => {
    const row = sum.addRow([f.label, f.member]);
    money(row.getCell(3), f.monthly);
    money(row.getCell(4), f.previousMaintenance);
    money(row.getCell(5), f.other);
    if (f.total > 0) {
      money(row.getCell(6), f.total);
      row.getCell(6).font = { bold: true, color: { argb: DUE } };
    } else {
      row.getCell(6).value = "Clear";
      row.getCell(6).font = { bold: true, color: { argb: CLEAR } };
      row.getCell(6).alignment = { horizontal: "right" };
    }
    body(row, i % 2 === 1);
  });
  const st = sum.addRow(["All flats", ""]);
  money(st.getCell(3), report.flats.reduce((s, f) => s + f.monthly, 0), false);
  money(st.getCell(4), totals.previousMaintenance, false);
  money(st.getCell(5), otherTotal, false);
  money(st.getCell(6), totals.grand, false);
  total(st);
  sum.autoFilter = { from: { row: 8, column: 1 }, to: { row: 8 + report.flats.length, column: 6 } };

  // 2. Details — every item, grouped by flat
  const det = wb.addWorksheet("Details", { views: [{ state: "frozen", ySplit: 4, showGridLines: false }] });
  det.columns = [{ width: 20 }, { width: 22 }, { width: 28 }, { width: 34 }, { width: 26 }, { width: 16 }];
  banner(det, 6, "Dues in detail", subtitle);
  const dh = det.getRow(4);
  dh.values = ["Flat", "Member", "Type", "Item", "Status", "Due"];
  header(dh);
  for (const f of report.flats.filter((x) => x.total > 0)) {
    f.items.forEach((item, i) => {
      const row = det.addRow([i === 0 ? f.label : "", i === 0 ? f.member : "", KIND_LABEL[item.kind], item.label, item.note]);
      money(row.getCell(6), item.due);
      if (item.note.startsWith("Partial")) row.getCell(5).font = { italic: true, color: { argb: "FFB45309" } };
      body(row, i % 2 === 1);
      if (i === 0) row.getCell(1).font = { bold: true, color: { argb: INK } };
    });
    const ft = det.addRow(["", "", "", "", `Total for ${f.label}`]);
    money(ft.getCell(6), f.total, false);
    total(ft);
    det.addRow([]);
  }
  if (totals.flatsWithDues === 0) det.addRow(["Every flat is clear — nothing is due."]);

  // 3. Totals — by type, then grand total (last tab)
  const tot = wb.addWorksheet("Totals", { views: [{ showGridLines: false }] });
  tot.columns = [{ width: 36 }, { width: 44 }, { width: 18 }];
  banner(tot, 3, "Totals", subtitle);
  const th = tot.getRow(4);
  th.values = ["Type", "Item", "Amount"];
  header(th);
  const lines: [string, string, number][] = [
    ["Monthly maintenance", "Unpaid months", totals.unpaidMonths],
    ["Monthly maintenance", "Part-paid months (remaining)", totals.partialMonths],
    ["Previous dues — maintenance", "All previous maintenance dues", totals.previousMaintenance],
    ...totals.other.map((o): [string, string, number] => ["Other dues", o.name, o.amount]),
  ];
  lines.forEach(([type, item, amount], i) => {
    const row = tot.addRow([type, item]);
    money(row.getCell(3), amount);
    body(row, i % 2 === 1);
  });
  const gt = tot.addRow(["Grand total", `${totals.flatsWithDues} flat(s) with dues`]);
  money(gt.getCell(3), totals.grand, false);
  total(gt);
  gt.getCell(3).font = { bold: true, size: 13, color: { argb: DUE } };
  gt.height = 22;

  return Buffer.from(await wb.xlsx.writeBuffer());
}
