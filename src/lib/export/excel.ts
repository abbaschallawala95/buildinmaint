import "server-only";
import ExcelJS from "exceljs";

export type ReportSection = {
  sheetName: string;
  headers: string[];
  rows: (string | number)[][];
};

export async function buildExcelReport(sections: ReportSection[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const section of sections) {
    const sheet = workbook.addWorksheet(section.sheetName.slice(0, 31));
    const headerRow = sheet.addRow(section.headers);
    headerRow.font = { bold: true };
    for (const row of section.rows) sheet.addRow(row);
    sheet.columns.forEach((col) => {
      col.width = 24;
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
