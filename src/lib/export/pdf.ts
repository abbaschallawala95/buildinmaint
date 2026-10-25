import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export type ReportSection = {
  heading: string;
  headers: string[];
  rows: (string | number)[][];
  // Relative column widths (e.g. [1, 1, 2] gives the 3rd column twice the width). Defaults to even split.
  colWeights?: number[];
};

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

export async function buildPdfReport(title: string, sections: ReportSection[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // Standard fonts only cover WinAnsi; anything else (Hindi, emoji, ₹) makes drawText throw.
  // ponytail: non-Latin text becomes "?"; embed a Unicode TTF via @pdf-lib/fontkit if it must render.
  const supported = new Set(font.getCharacterSet());
  const safe = (text: string) =>
    Array.from(text.replace(/₹/g, "Rs."), (c) => (supported.has(c.codePointAt(0)!) ? c : "?")).join("");

  let page = doc.addPage(PAGE_SIZE);
  let y = PAGE_SIZE[1] - MARGIN;

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage(PAGE_SIZE);
      y = PAGE_SIZE[1] - MARGIN;
    }
  };

  page.drawText(safe(title), { x: MARGIN, y, size: 16, font: boldFont, color: rgb(0, 0, 0) });
  y -= 26;

  for (const section of sections) {
    newPageIfNeeded(36);
    page.drawText(safe(section.heading), { x: MARGIN, y, size: 12, font: boldFont });
    y -= 18;

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

    // Each cell wraps inside its column; the row is as tall as its tallest cell.
    const drawRow = (cells: (string | number)[], f: PDFFont) => {
      const lines = cells.map((c, i) => wrap(safe(String(c)), f, colW[i]));
      const height = Math.max(...lines.map((l) => l.length)) * LINE_HEIGHT;
      newPageIfNeeded(height);
      lines.forEach((cellLines, i) =>
        cellLines.forEach((line, n) =>
          page.drawText(line, { x: colX[i], y: y - n * LINE_HEIGHT, size: FONT_SIZE, font: f }),
        ),
      );
      y -= height;
    };

    drawRow(section.headers, boldFont);
    y -= 3;
    for (const row of section.rows) drawRow(row, font);
    y -= 16;
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
