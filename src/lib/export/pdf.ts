import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export type ReportSection = {
  heading: string;
  headers: string[];
  rows: (string | number)[][];
  // Relative column widths (e.g. [1, 1, 2] gives the 3rd column twice the width). Defaults to even split.
  colWeights?: number[];
  // Columns to right-align (amounts). Defaults to all left.
  rightAlign?: number[];
  // Row indexes drawn as totals (bold, shaded).
  totalRows?: number[];
};

const BRAND = rgb(0.31, 0.27, 0.9);
const BRAND_SOFT = rgb(0.93, 0.95, 1);
const STRIPE = rgb(0.97, 0.98, 0.99);
const RULE = rgb(0.89, 0.91, 0.94);
const WHITE = rgb(1, 1, 1);
const INK = rgb(0.12, 0.16, 0.22);
const PAD = 3;

const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4
const MARGIN = 40;
const FONT_SIZE = 9;
const LINE_HEIGHT = 11;
const CELL_GAP = 6;

// Greedy word wrap to `width`; words longer than a line are split by character.
export function wrap(text: string, font: PDFFont, width: number): string[] {
  const fits = (s: string) => font.widthOfTextAtSize(s, FONT_SIZE) <= width;
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate)) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const ch of word) {
      if (line && !fits(line + ch)) {
        lines.push(line);
        line = "";
      }
      line += ch;
    }
  }
  lines.push(line);
  return lines;
}

// Standard fonts only cover WinAnsi; anything else (Hindi, emoji, ₹) makes drawText throw.
// ponytail: non-Latin text becomes "?"; embed a Unicode TTF via @pdf-lib/fontkit if it must render.
export function safeText(font: PDFFont) {
  const supported = new Set(font.getCharacterSet());
  return (text: string) => Array.from(text.replace(/₹/g, "Rs."), (c) => (supported.has(c.codePointAt(0)!) ? c : "?")).join("");
}

export async function buildPdfReport(title: string, sections: ReportSection[], subtitle?: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const safe = safeText(font);

  let page = doc.addPage(PAGE_SIZE);
  let y = PAGE_SIZE[1] - MARGIN;

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage(PAGE_SIZE);
      y = PAGE_SIZE[1] - MARGIN;
    }
  };

  // Title bar
  page.drawRectangle({ x: 0, y: y - 16, width: PAGE_SIZE[0], height: 56, color: BRAND });
  page.drawText(safe(title), { x: MARGIN, y: y + 6, size: 16, font: boldFont, color: WHITE });
  if (subtitle) page.drawText(safe(subtitle), { x: MARGIN, y: y - 8, size: 8, font, color: rgb(0.85, 0.87, 1) });
  y -= 40;

  for (const section of sections) {
    newPageIfNeeded(36);
    page.drawText(safe(section.heading), { x: MARGIN, y, size: 12, font: boldFont, color: INK });
    y -= 18;
    const right = new Set(section.rightAlign ?? []);
    const totals = new Set(section.totalRows ?? []);

    const usableWidth = PAGE_SIZE[0] - MARGIN * 2;
    const weights = section.colWeights ?? section.headers.map(() => 1);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const colX: number[] = [];
    const colW: number[] = [];
    let cursor = MARGIN;
    for (const w of weights) {
      colX.push(cursor);
      colW.push((usableWidth * w) / totalWeight - CELL_GAP);
      cursor += (usableWidth * w) / totalWeight;
    }

    // Each cell wraps inside its column; the row is as tall as its tallest cell. A background
    // band (header / stripe / total) is drawn behind the text, and a hairline under each row.
    const drawRow = (cells: (string | number)[], f: PDFFont, band?: ReturnType<typeof rgb>, color = INK) => {
      const lines = cells.map((c, i) => wrap(safe(String(c)), f, colW[i]));
      const height = Math.max(...lines.map((l) => l.length)) * LINE_HEIGHT + PAD * 2;
      newPageIfNeeded(height);
      const top = y + FONT_SIZE; // text baseline sits FONT_SIZE below the row top
      if (band) page.drawRectangle({ x: MARGIN - PAD, y: top - height, width: usableWidth + PAD, height, color: band });
      lines.forEach((cellLines, i) =>
        cellLines.forEach((line, n) => {
          const x = right.has(i) ? colX[i] + colW[i] - f.widthOfTextAtSize(line, FONT_SIZE) : colX[i];
          page.drawText(line, { x, y: y - PAD - n * LINE_HEIGHT, size: FONT_SIZE, font: f, color });
        }),
      );
      page.drawLine({ start: { x: MARGIN - PAD, y: top - height }, end: { x: MARGIN + usableWidth, y: top - height }, thickness: 0.5, color: RULE });
      y -= height;
    };

    drawRow(section.headers, boldFont, BRAND, WHITE);
    section.rows.forEach((row, i) =>
      totals.has(i) ? drawRow(row, boldFont, BRAND_SOFT) : drawRow(row, font, i % 2 === 1 ? STRIPE : undefined),
    );
    y -= 16;
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
