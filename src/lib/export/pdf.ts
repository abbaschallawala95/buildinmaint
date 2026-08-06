import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type ReportSection = {
  heading: string;
  headers: string[];
  rows: (string | number)[][];
  // Relative column widths (e.g. [1, 1, 2] gives the 3rd column twice the width). Defaults to even split.
  colWeights?: number[];
};

const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4
const MARGIN = 40;

export async function buildPdfReport(title: string, sections: ReportSection[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage(PAGE_SIZE);
  let y = PAGE_SIZE[1] - MARGIN;

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage(PAGE_SIZE);
      y = PAGE_SIZE[1] - MARGIN;
    }
  };

  page.drawText(title, { x: MARGIN, y, size: 16, font: boldFont, color: rgb(0, 0, 0) });
  y -= 26;

  for (const section of sections) {
    newPageIfNeeded(36);
    page.drawText(section.heading, { x: MARGIN, y, size: 12, font: boldFont });
    y -= 18;

    const usableWidth = PAGE_SIZE[0] - MARGIN * 2;
    const weights = section.colWeights ?? section.headers.map(() => 1);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const colX: number[] = [];
    let cursor = MARGIN;
    for (const w of weights) {
      colX.push(cursor);
      cursor += (usableWidth * w) / totalWeight;
    }

    newPageIfNeeded(16);
    section.headers.forEach((h, i) => {
      page.drawText(h, { x: colX[i], y, size: 9, font: boldFont });
    });
    y -= 14;

    for (const row of section.rows) {
      newPageIfNeeded(13);
      row.forEach((cell, i) => {
        page.drawText(String(cell), { x: colX[i], y, size: 9, font });
      });
      y -= 13;
    }
    y -= 16;
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
