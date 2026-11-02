import "server-only";
import { LineCapStyle, PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { MONTH_NAMES, SHORT_MONTHS, firstShownMonth, periodLabel, previousLabel, type HeadRow, type SectionKey } from "@/lib/analytics";
import type { AnalyticsData } from "@/lib/analytics-data";
import { safeText, wrap } from "@/lib/export/pdf";

// The Analytics page drawn as a PDF: cards, bar chart, arrows and "New" tags (see
// src/components/analytics/sections.tsx). Everything is vector, so text stays selectable.

const PAGE: [number, number] = [841.89, 595.28]; // A4 landscape
const MARGIN = 32;
const BOTTOM = 36;
const W = PAGE[0] - MARGIN * 2;

const BRAND = rgb(0.31, 0.27, 0.9);
const BRAND_DEEP = rgb(0.22, 0.19, 0.64);
const BRAND_SOFT = rgb(0.93, 0.95, 1);
const WHITE = rgb(1, 1, 1);
const INK = rgb(0.12, 0.16, 0.22);
const MUTED = rgb(0.39, 0.45, 0.55);
const RULE = rgb(0.89, 0.91, 0.94);
const AXIS = rgb(0.58, 0.64, 0.72);
const TRACK = rgb(0.89, 0.91, 0.94);
// Same colour-blind-safe income/expense pair as the page (teal-600, rose-600).
const TEAL = rgb(0.051, 0.58, 0.533);
const ROSE = rgb(0.882, 0.114, 0.282);

const num = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
const rs = (n: number) => `${n < 0 ? "-" : ""}Rs. ${num(Math.abs(n))}`;

type TextOptions = { size?: number; bold?: boolean; color?: RGB; align?: "left" | "right" | "center"; max?: number };
type BoxOptions = { fill?: RGB; border?: RGB; dash?: boolean; radius?: number };

class Canvas {
  page: PDFPage;
  y = PAGE[1] - MARGIN;
  private safe: (text: string) => string;

  constructor(
    private doc: PDFDocument,
    readonly font: PDFFont,
    private boldFont: PDFFont,
  ) {
    this.page = doc.addPage(PAGE);
    this.safe = safeText(font);
  }

  // Starts a new page if `height` doesn't fit; true when it did.
  ensure(height: number) {
    if (this.y - height >= BOTTOM) return false;
    this.page = this.doc.addPage(PAGE);
    this.y = PAGE[1] - MARGIN;
    return true;
  }

  width(text: string, size = 9, bold = false) {
    return (bold ? this.boldFont : this.font).widthOfTextAtSize(this.safe(text), size);
  }

  // `x` is the left edge, right edge or centre, per `align`. With `max`, shrinks then truncates to fit.
  text(raw: string, x: number, y: number, { size = 9, bold = false, color = INK, align = "left", max }: TextOptions = {}) {
    const font = bold ? this.boldFont : this.font;
    let text = this.safe(raw);
    if (max) {
      while (size > 6 && font.widthOfTextAtSize(text, size) > max) size -= 0.5;
      if (font.widthOfTextAtSize(text, size) > max) {
        while (text && font.widthOfTextAtSize(`${text}...`, size) > max) text = text.slice(0, -1);
        text = `${text}...`;
      }
    }
    const w = font.widthOfTextAtSize(text, size);
    this.page.drawText(text, { x: align === "right" ? x - w : align === "center" ? x - w / 2 : x, y, size, font, color });
  }

  box(x: number, top: number, w: number, h: number, { fill, border, dash, radius = 0 }: BoxOptions = {}) {
    const r = Math.min(radius, w / 2, h / 2);
    const path = `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
    this.page.drawSvgPath(path, { x, y: top, color: fill, borderColor: border, borderWidth: border ? 0.75 : 0, borderDashArray: dash ? [4, 3] : undefined });
  }

  // A bar rounded at the top, standing on `base`.
  bar(x: number, base: number, w: number, h: number, color: RGB) {
    const r = Math.min(2, w / 2, h);
    this.page.drawSvgPath(`M 0 ${h} V ${r} Q 0 0 ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h} Z`, { x, y: base + h, color });
  }

  line(x1: number, y1: number, x2: number, y2: number, color = RULE, thickness = 0.5) {
    this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color, lineCap: LineCapStyle.Round });
  }

  // Same diagonal arrows as the page. Drawn, because the standard fonts have no arrow characters.
  arrow(x: number, y: number, up: boolean, color: RGB) {
    const s = 5;
    const [fromY, toY, headY] = up ? [y, y + s, y + s - 3.5] : [y + s, y, y + 3.5];
    this.line(x, fromY, x + s, toY, color, 0.9);
    this.line(x + s, toY, x + s - 3.5, toY, color, 0.9);
    this.line(x + s, toY, x + s, headY, color, 0.9);
  }

  // Right-aligned "New" tag ending at `right`.
  newTag(right: number, y: number) {
    const w = this.width("New", 6.5, true) + 8;
    this.box(right - w, y + 7, w, 10, { fill: WHITE, border: BRAND, radius: 5 }); // stays visible on the shaded month
    this.text("New", right - 4, y, { size: 6.5, bold: true, color: BRAND, align: "right" });
  }
}

// For expenses up is bad (rose); for income (invert) up is good (teal).
const changeColor = (value: number, invert = false) => ((invert ? value < 0 : value > 0) ? ROSE : TEAL);

function heading(c: Canvas, title: string, note?: string) {
  c.text(title, MARGIN, c.y - 10, { size: 12, bold: true });
  c.y -= 16;
  if (note) {
    c.text(note, MARGIN, c.y - 8, { size: 8, color: MUTED });
    c.y -= 13;
  }
  c.y -= 4;
}

function statCard(c: Canvas, x: number, w: number, top: number, h: number, label: string, value: string, sub: string, primary = false) {
  c.box(x, top, w, h, primary ? { fill: BRAND, radius: 8 } : { fill: WHITE, border: RULE, radius: 8 });
  c.text(label, x + 12, top - 16, { size: 8, bold: true, color: primary ? BRAND_SOFT : MUTED });
  c.text(value, x + 12, top - 38, { size: 18, bold: true, color: primary ? WHITE : INK, max: w - 24 });
  c.text(sub, x + 12, top - 52, { size: 8, color: primary ? BRAND_SOFT : MUTED, max: w - 24 });
}

function summary(c: Canvas, { year: a, period }: AnalyticsData) {
  const h = 64;
  c.ensure(h);
  const gap = 10;
  const w = (W - gap * 2) / 3;
  const net = a.totalIncome - a.totalExpense;
  statCard(c, MARGIN, w, c.y, h, `Spent in ${period.year}`, rs(a.totalExpense), `across ${a.expenseHeads.filter((x) => x.total > 0).length} expense heads`, true);
  statCard(c, MARGIN + w + gap, w, c.y, h, `Collected in ${period.year}`, rs(a.totalIncome), `${net >= 0 ? "Saved" : "Short by"} ${rs(Math.abs(net))}`);
  statCard(
    c,
    MARGIN + (w + gap) * 2,
    w,
    c.y,
    h,
    "Costliest month",
    a.costliestMonth ? MONTH_NAMES[a.costliestMonth - 1] : "-",
    a.costliestMonth ? `${rs(a.months[a.costliestMonth - 1].expense)} spent` : "No expenses yet",
  );
  c.y -= h;
}

// Round axis steps: 1, 2 or 5 × a power of ten, never below 1.
function niceStep(raw: number) {
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const fraction = raw / power;
  return Math.max(1, (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power);
}

function chart(c: Canvas, data: AnalyticsData) {
  const shown = data.year.months.slice(firstShownMonth(data.year, data.period.month) - 1);
  const selected = data.year.months[data.period.month - 1];
  const plotH = 130;
  const cardH = plotH + 88;
  c.ensure(cardH + 20);
  heading(c, "Money in vs money out");
  // Legend on the heading's line.
  const legendY = c.y + 10;
  const legendX = MARGIN + W - 118;
  c.box(legendX, legendY + 7, 8, 8, { fill: TEAL, radius: 2 });
  c.text("Income", legendX + 11, legendY, { size: 8, color: MUTED });
  c.box(legendX + 54, legendY + 7, 8, 8, { fill: ROSE, radius: 2 });
  c.text("Expenses", legendX + 65, legendY, { size: 8, color: MUTED });

  const top = c.y;
  c.box(MARGIN, top, W, cardH, { fill: WHITE, border: RULE, radius: 8 });
  const left = MARGIN + 46;
  const plotW = W - 46 - 12;
  const plotTop = top - 14;
  const base = plotTop - plotH;
  const peak = Math.max(1, ...shown.flatMap((m) => [m.income, m.expense]));
  const step = niceStep(peak / 4);
  const max = Math.ceil(peak / step) * step;
  const groupW = plotW / shown.length;

  // Selected month band, then a recessive grid, then the bars on top.
  const selectedIndex = shown.findIndex((m) => m.month === data.period.month);
  if (selectedIndex >= 0) c.box(left + selectedIndex * groupW, plotTop + 4, groupW, plotH + 52, { fill: BRAND_SOFT, radius: 4 });
  for (let v = 0; v <= max; v += step) {
    const y = base + (v / max) * plotH;
    c.line(left, y, left + plotW, y, v === 0 ? AXIS : RULE);
    c.text(num(v), left - 6, y - 2.5, { size: 7, color: MUTED, align: "right" });
  }
  const barW = Math.min(24, (groupW - 10) / 2);
  shown.forEach((m, i) => {
    const centre = left + i * groupW + groupW / 2;
    const heightOf = (v: number) => (v > 0 ? Math.max(1, (v / max) * plotH) : 0);
    if (m.income > 0) c.bar(centre - barW - 1, base, barW, heightOf(m.income), TEAL);
    if (m.expense > 0) c.bar(centre + 1, base, barW, heightOf(m.expense), ROSE);
    const isSelected = m.month === data.period.month;
    c.text(SHORT_MONTHS[m.month - 1], centre, base - 11, { size: 8, bold: isSelected, color: isSelected ? INK : MUTED, align: "center" });
    // Exact values under the bars, so the chart can be read without guessing heights.
    c.text(num(m.income), centre, base - 23, { size: 7, align: "center", max: groupW - 4 });
    c.text(num(m.expense), centre, base - 34, { size: 7, align: "center", max: groupW - 4 });
  });
  c.box(MARGIN + 8, base - 16.5, 6, 6, { fill: TEAL, radius: 1.5 });
  c.text("In", MARGIN + 17, base - 23, { size: 7, color: MUTED });
  c.box(MARGIN + 8, base - 27.5, 6, 6, { fill: ROSE, radius: 1.5 });
  c.text("Out", MARGIN + 17, base - 34, { size: 7, color: MUTED });
  c.text(`${MONTH_NAMES[data.period.month - 1]}: income ${rs(selected.income)}, expenses ${rs(selected.expense)}.`, MARGIN + 12, base - 54, { size: 8, color: MUTED });
  c.y -= cardH;
}

function focus(c: Canvas, data: AnalyticsData) {
  const { period, year } = data;
  const previous = previousLabel(period);
  const items = year.expenseHeads
    .map((h) => ({ head: h.head, cell: h.cells[period.month - 1] }))
    .filter((f) => f.cell.amount > 0)
    .sort((x, y) => y.cell.amount - x.cell.amount);
  const added = items.filter((f) => f.cell.isNew);
  const regular = items.filter((f) => !f.cell.isNew);
  const dropped = year.expenseHeads.filter((h) => h.cells[period.month - 1].dropped);
  const gap = 8;
  const colW = (W - gap * 2) / 3;
  const rowsOf = <T,>(list: T[]) => Array.from({ length: Math.ceil(list.length / 3) }, (_, i) => list.slice(i * 3, i * 3 + 3));

  c.ensure(80);
  heading(c, `${periodLabel(period)} vs ${previous}`);
  if (items.length === 0) {
    c.text("No expenses this month.", MARGIN, c.y - 9, { color: MUTED });
    c.y -= 14;
  }

  if (added.length > 0) {
    const inner = (W - 24 - gap * 2) / 3;
    const chipRows = rowsOf(added);
    const h = 28 + chipRows.length * 26;
    c.ensure(h);
    c.box(MARGIN, c.y, W, h, { fill: BRAND_SOFT, border: BRAND, dash: true, radius: 8 });
    c.text(`Additional this month - nothing was spent on ${added.length === 1 ? "this" : "these"} in ${previous}`, MARGIN + 12, c.y - 17, { size: 9, bold: true, max: W - 24 });
    chipRows.forEach((row, r) =>
      row.forEach((f, i) => {
        const x = MARGIN + 12 + i * (inner + gap);
        const top = c.y - 26 - r * 26;
        c.box(x, top, inner, 21, { fill: WHITE, radius: 5 });
        const amount = rs(f.cell.amount);
        c.text(f.head, x + 8, top - 14, { size: 8.5, max: inner - 20 - c.width(amount, 9, true) });
        c.text(amount, x + inner - 8, top - 14, { bold: true, align: "right" });
      }),
    );
    c.y -= h + 8;
  }

  for (const row of rowsOf(regular)) {
    const h = 56;
    c.ensure(h);
    row.forEach((f, i) => {
      const x = MARGIN + i * (colW + gap);
      const { amount, change } = f.cell;
      c.box(x, c.y, colW, h, { fill: WHITE, border: RULE, radius: 8 });
      c.text(f.head, x + 10, c.y - 15, { size: 8.5, color: MUTED, max: colW - 20 });
      c.text(rs(amount), x + 10, c.y - 32, { size: 13, bold: true, max: colW - 20 });
      if (change === 0) {
        c.text(`Same as ${previous}`, x + 10, c.y - 46, { size: 7.5, color: MUTED, max: colW - 20 });
      } else {
        c.arrow(x + 10, c.y - 46, change > 0, changeColor(change));
        c.text(`${rs(Math.abs(change))} ${change > 0 ? "more" : "less"} than ${previous} (${rs(amount - change)})`, x + 19, c.y - 46, { size: 7.5, color: MUTED, max: colW - 29 });
      }
    });
    c.y -= h + 8;
  }

  if (dropped.length > 0) {
    const note = `Not this month: ${dropped.map((h) => `${h.head} (${rs(-h.cells[period.month - 1].change)} in ${previous})`).join(", ")}`;
    for (const line of wrap(safeText(c.font)(note), c.font, W)) {
      c.ensure(12);
      c.text(line, MARGIN, c.y - 9, { color: MUTED });
      c.y -= 12;
    }
  }
}

type Cell = { text?: string; bold?: boolean; muted?: boolean; change?: number; invert?: boolean; isNew?: boolean; note?: string };
type Row = { cells: Cell[]; total?: boolean };

const LINE = 10.5;

// Column 0 is left-aligned and wraps; the rest are right-aligned. `highlight` shades one column.
// The header repeats when the table runs onto another page.
function table(c: Canvas, widths: number[], headers: string[], rows: Row[], highlight?: number) {
  const xs = widths.map((_, i) => MARGIN + widths.slice(0, i).reduce((s, w) => s + w, 0));
  const PAD = 5;
  const headerH = 18;
  const firstLines = (cell: Cell) => wrap(safeText(c.font)(cell.text ?? ""), c.font, widths[0] - PAD * 2);
  const heightOf = (r: Row) => {
    const lines = r.cells.map((cell, i) => (cell.text ? (i === 0 ? firstLines(cell).length : 1) : 0) + (cell.change || cell.isNew || cell.note ? 1 : 0));
    return Math.max(...lines) * LINE + 8;
  };
  const drawHeader = () => {
    c.box(MARGIN, c.y, W, headerH, { fill: BRAND });
    if (highlight !== undefined) c.box(xs[highlight], c.y, widths[highlight], headerH, { fill: BRAND_DEEP });
    headers.forEach((h, i) =>
      i === 0
        ? c.text(h, xs[0] + PAD, c.y - 12, { size: 8.5, bold: true, color: WHITE, max: widths[0] - PAD * 2 })
        : c.text(h, xs[i] + widths[i] - PAD, c.y - 12, { size: 8.5, bold: true, color: WHITE, align: "right", max: widths[i] - PAD * 2 }),
    );
    c.y -= headerH;
  };

  c.ensure(headerH + (rows[0] ? heightOf(rows[0]) : 0));
  drawHeader();
  for (const row of rows) {
    const h = heightOf(row);
    if (c.ensure(h)) drawHeader();
    if (row.total) c.box(MARGIN, c.y, W, h, { fill: BRAND_SOFT });
    if (highlight !== undefined) c.box(xs[highlight], c.y, widths[highlight], h, { fill: BRAND_SOFT });
    row.cells.forEach((cell, i) => {
      let y = c.y - 11;
      const right = xs[i] + widths[i] - PAD;
      const options = { bold: cell.bold || row.total, color: cell.muted ? MUTED : INK };
      if (i === 0) {
        for (const line of firstLines(cell)) {
          c.text(line, xs[0] + PAD, y, options);
          y -= LINE;
        }
        return;
      }
      if (cell.text) {
        c.text(cell.text, right, y, { ...options, size: 8.5, align: "right", max: widths[i] - PAD * 2 });
        y -= LINE;
      }
      if (cell.isNew) c.newTag(right, y);
      else if (cell.note) c.text(cell.note, right, y, { size: 7.5, color: MUTED, align: "right", max: widths[i] - PAD * 2 });
      else if (cell.change) {
        const value = num(Math.abs(cell.change));
        c.text(value, right, y, { size: 7.5, color: MUTED, align: "right" });
        c.arrow(right - c.width(value, 7.5) - 7, y, cell.change > 0, changeColor(cell.change, cell.invert));
      }
    });
    if (row.total) c.line(MARGIN, c.y, MARGIN + W, c.y, BRAND, 1);
    c.y -= h;
    c.line(MARGIN, c.y, MARGIN + W, c.y);
  }
}

function compare(c: Canvas, { comparison, compare: other, period }: AnalyticsData) {
  if (!comparison || !other) return;
  const a = periodLabel(other);
  const b = periodLabel(period);
  c.ensure(120);
  heading(c, `${b} vs ${a}`, `Difference = ${b} - ${a}.`);

  const gap = 10;
  const w = (W - gap) / 2;
  const h = 46;
  (["expense", "income"] as const).forEach((kind, i) => {
    const x = MARGIN + i * (w + gap);
    const { a: from, b: to } = comparison.totals[kind];
    c.box(x, c.y, w, h, { fill: WHITE, border: RULE, radius: 8 });
    c.text(kind === "expense" ? "Expenses" : "Income", x + 12, c.y - 15, { size: 8, bold: true, color: MUTED });
    c.text(`${rs(from)} to ${rs(to)}`, x + 12, c.y - 33, { size: 12, bold: true, max: w - 110 });
    const diff = to - from;
    if (diff !== 0) {
      const value = rs(Math.abs(diff));
      c.text(value, x + w - 12, c.y - 33, { size: 8, color: MUTED, align: "right" });
      c.arrow(x + w - 12 - c.width(value, 8) - 8, c.y - 33, diff > 0, changeColor(diff, kind === "income"));
    }
  });
  c.y -= h + 10;

  const widths = [W * 0.4, W * 0.2, W * 0.2, W * 0.2];
  for (const kind of ["expense", "income"] as const) {
    const rows = comparison.rows.filter((r) => r.kind === kind);
    if (rows.length === 0) continue;
    table(
      c,
      widths,
      [kind === "expense" ? "Expense" : "Income", a, b, "Difference"],
      rows.map((r) => ({
        cells: [
          { text: r.head, bold: true },
          { text: r.a ? rs(r.a) : "-", muted: !r.a },
          { text: r.b ? rs(r.b) : "-", muted: !r.b },
          r.a === 0 ? { isNew: true } : r.b === 0 ? { note: `Not in ${b}` } : r.diff === 0 ? { note: "Same" } : { change: r.diff, invert: kind === "income" },
        ],
      })),
    );
    c.y -= 10;
  }
}

function headGrid(c: Canvas, data: AnalyticsData, kind: "expense" | "income") {
  const heads: HeadRow[] = kind === "expense" ? data.year.expenseHeads : data.year.incomeHeads;
  const from = firstShownMonth(data.year, data.period.month) - 1;
  const shown = data.year.months.slice(from);
  const verb = kind === "expense" ? "spent on" : "received from";
  c.ensure(90);
  heading(c, kind === "expense" ? "Every expense, every month" : "Every income, every month", `Arrows show the change from the month before. New = nothing ${verb} it the month before. Amounts in Rs.`);
  if (heads.length === 0) {
    c.text(`No ${kind} in ${data.period.year} yet.`, MARGIN, c.y - 9, { color: MUTED });
    c.y -= 14;
    return;
  }

  const totalW = 62;
  const monthW = Math.min(80, (W - 130 - totalW) / shown.length);
  const widths = [W - totalW - monthW * shown.length, ...shown.map(() => monthW), totalW];
  const invert = kind === "income";
  const rows: Row[] = heads.map((h) => ({
    cells: [
      { text: h.head, bold: true },
      ...h.cells.slice(from).map((cell): Cell =>
        cell.amount === 0
          ? { text: "-", muted: true }
          : cell.isNew
            ? { text: num(cell.amount), isNew: true }
            : { text: num(cell.amount), change: cell.dropped ? 0 : cell.change, invert },
      ),
      { text: num(h.total), bold: true },
    ],
  }));
  rows.push({
    total: true,
    cells: [
      { text: kind === "expense" ? "All expenses" : "All income" },
      ...shown.map((m): Cell => ({ text: num(m[kind]) })),
      { text: num(kind === "expense" ? data.year.totalExpense : data.year.totalIncome) },
    ],
  });
  table(c, widths, [kind === "expense" ? "Expense" : "Income", ...shown.map((m) => SHORT_MONTHS[m.month - 1]), "Total"], rows, data.period.month - from);
}

function collection(c: Canvas, data: AnalyticsData) {
  const from = firstShownMonth(data.year, data.period.month) - 1;
  const months = data.collection.slice(from);
  const pct = (m: { expected: number; collected: number }) => (m.expected > 0 ? Math.min(100, Math.round((m.collected / m.expected) * 100)) : 0);
  const selected = data.collection[data.period.month - 1];
  const tileH = 50;
  c.ensure(tileH + 62);
  heading(c, "Maintenance collection", "Share of each month's maintenance that has been paid.");

  const gap = 6;
  const tileW = (W - gap * 11) / 12;
  months.forEach((m, i) => {
    const x = MARGIN + i * (tileW + gap);
    const isSelected = m.month === data.period.month;
    c.box(x, c.y, tileW, tileH, isSelected ? { fill: BRAND_SOFT, border: BRAND, radius: 6 } : { fill: WHITE, border: RULE, radius: 6 });
    c.text(SHORT_MONTHS[m.month - 1], x + tileW / 2, c.y - 12, { size: 7.5, color: MUTED, align: "center" });
    c.text(`${pct(m)}%`, x + tileW / 2, c.y - 28, { size: 12, bold: true, align: "center" });
    const barW = tileW - 14;
    c.box(x + 7, c.y - 36, barW, 4, { fill: TRACK, radius: 2 });
    if (pct(m) > 0) c.box(x + 7, c.y - 36, (barW * pct(m)) / 100, 4, { fill: BRAND, radius: 2 });
  });
  c.y -= tileH + 8;

  const left = selected.behind.length;
  c.text(
    `${MONTH_NAMES[data.period.month - 1]}: ${rs(selected.collected)} collected of ${rs(selected.expected)} - ${left === 0 ? "every flat has paid" : `${left} flat${left === 1 ? "" : "s"} still to pay`}`,
    MARGIN,
    c.y - 9,
    { bold: true, max: W },
  );
  c.y -= 16;

  let x = MARGIN;
  for (const flat of selected.behind) {
    const w = Math.min(W, c.width(flat, 8) + 14);
    if (x + w > MARGIN + W) {
      x = MARGIN;
      c.y -= 20;
    }
    if (c.ensure(16)) x = MARGIN;
    c.box(x, c.y, w, 16, { fill: BRAND_SOFT, radius: 8 });
    c.text(flat, x + 7, c.y - 11, { size: 8, max: w - 14 });
    x += w + 5;
  }
  if (left > 0) c.y -= 20;
}

export async function buildAnalyticsPdf(data: AnalyticsData, sections: readonly SectionKey[], buildingName: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const c = new Canvas(doc, font, bold);
  const title = `Analytics - ${periodLabel(data.period)}`;
  const subtitle = [buildingName, data.compare && `compared with ${periodLabel(data.compare)}`].filter(Boolean).join(" - ");

  const barH = 60;
  c.page.drawRectangle({ x: 0, y: PAGE[1] - barH, width: PAGE[0], height: barH, color: BRAND });
  c.text(title, MARGIN, PAGE[1] - 29, { size: 18, bold: true, color: WHITE });
  c.text(subtitle, MARGIN, PAGE[1] - 45, { size: 9, color: BRAND_SOFT, max: W });
  c.y = PAGE[1] - barH - 16;

  const draw: Record<SectionKey, () => void> = {
    summary: () => summary(c, data),
    chart: () => chart(c, data),
    focus: () => focus(c, data),
    compare: () => compare(c, data),
    expenses: () => headGrid(c, data, "expense"),
    income: () => headGrid(c, data, "income"),
    collection: () => collection(c, data),
  };
  for (const key of sections) {
    draw[key]();
    c.y -= 18;
  }

  const pages = doc.getPages();
  pages.forEach((page, i) => {
    c.page = page;
    c.text(subtitle, MARGIN, 18, { size: 7.5, color: MUTED, max: W - 80 });
    c.text(`Page ${i + 1} of ${pages.length}`, PAGE[0] - MARGIN, 18, { size: 7.5, color: MUTED, align: "right" });
  });

  return Buffer.from(await doc.save());
}
