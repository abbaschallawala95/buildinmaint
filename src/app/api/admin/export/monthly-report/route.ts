import { monthParam } from "@/lib/utils";
import { NextRequest } from "next/server";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { getFinancialOverview } from "@/lib/finance";
import { rateForMonth } from "@/lib/rate-history";
import { buildExcelReport } from "@/lib/export/excel";
import { buildPdfReport } from "@/lib/export/pdf";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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
  const month = monthParam(searchParams.get("month"));
  const year = Number(searchParams.get("year")) || now.getFullYear();

  const [overview, flats] = await Promise.all([
    getFinancialOverview(buildingId, { month, year }),
    prisma.flat.findMany({
      where: { floor: { buildingId } },
      orderBy: [{ floor: { sortOrder: "asc" } }, { flatNumber: "asc" }],
      include: { floor: true, member: true, payments: { where: { month, year } }, maintenanceRates: true },
    }),
  ]);

  const summaryRows: (string | number)[][] = [
    ["Opening Balance (Rs.)", overview.openingBalance.toFixed(2)],
    ["Income This Month (Rs.)", overview.monthIncome.toFixed(2)],
    ["Expenses This Month (Rs.)", overview.monthExpenses.toFixed(2)],
    ["Closing Balance — All-Time (Rs.)", overview.closingBalance.toFixed(2)],
  ];

  const maintenanceRows = flats.map((f) => {
    const rate = rateForMonth(
      f.maintenanceRates.map((r) => ({
        amount: Number(r.amount),
        effectiveMonth: r.effectiveMonth,
        effectiveYear: r.effectiveYear,
      })),
      month,
      year,
    );
    const paid = f.payments[0]?.status === "PAID";
    return [`${f.floor.name} / ${f.flatNumber}`, f.member?.name ?? "Unassigned", rate.toFixed(2), paid ? "Paid" : "Unpaid"];
  });

  const transactionRows = overview.monthTransactions.map((t) => [
    t.date.toLocaleDateString("en-IN"),
    t.description,
    t.kind === "income" ? "Income" : "Expense",
    t.amount.toFixed(2),
  ]);

  const title = `Monthly Report - ${MONTH_NAMES[month - 1]} ${year}`;
  const filename = `monthly-report-${year}-${String(month).padStart(2, "0")}`;

  const sections = [
    { heading: "Summary", headers: ["Metric", "Amount"], rows: summaryRows },
    {
      heading: "Maintenance Status by Flat",
      headers: ["Flat", "Member", "Amount (Rs.)", "Status"],
      rows: maintenanceRows,
    },
    {
      heading: "Transactions",
      headers: ["Date", "Description", "Type", "Amount (Rs.)"],
      rows: transactionRows,
    },
  ];

  if (format === "pdf") {
    const buffer = await buildPdfReport(title, sections);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  }

  const buffer = await buildExcelReport(
    sections.map((s) => ({ sheetName: s.heading, headers: s.headers, rows: s.rows })),
  );
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}
