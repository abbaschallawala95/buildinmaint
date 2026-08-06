import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDueSchedule, totalDue } from "@/lib/maintenance-dues";
import { buildExcelReport } from "@/lib/export/excel";
import { buildPdfReport } from "@/lib/export/pdf";

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET(req: NextRequest) {
  try {
    await requireRole("SUPER_ADMIN");
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") === "pdf" ? "pdf" : "excel";
  const now = new Date();

  const flats = await prisma.flat.findMany({
    orderBy: [{ floor: { sortOrder: "asc" } }, { flatNumber: "asc" }],
    include: {
      floor: true,
      member: true,
      payments: true,
      maintenanceRates: true,
      additionalCharges: { where: { status: "UNPAID" } },
    },
  });

  let grandTotal = 0;
  const rows = flats.map((f) => {
    const schedule = buildDueSchedule(
      f.maintenanceRates.map((r) => ({
        amount: Number(r.amount),
        effectiveMonth: r.effectiveMonth,
        effectiveYear: r.effectiveYear,
      })),
      f.payments.map((p) => ({
        month: p.month,
        year: p.year,
        status: p.status,
        amount: Number(p.amount),
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
      })),
      now.getMonth() + 1,
      now.getFullYear(),
    );
    const unpaidMonths = schedule.filter((s) => s.status === "UNPAID");
    const maintenanceDue = totalDue(schedule);
    const chargesDue = f.additionalCharges.reduce((sum, c) => sum + Number(c.amount), 0);
    const total = maintenanceDue + chargesDue;
    grandTotal += total;
    return [
      `${f.floor.name} / ${f.flatNumber}`,
      f.member?.name ?? "Unassigned",
      unpaidMonths.length,
      unpaidMonths.map((s) => `${MONTH_ABBR[s.month - 1]} ${s.year}`).join(", ") || "-",
      maintenanceDue.toFixed(2),
      chargesDue.toFixed(2),
      total.toFixed(2),
    ];
  });
  rows.push(["", "", "", "", "", "Grand Total (Rs.)", grandTotal.toFixed(2)]);

  const title = `Total Dues Report - as of ${now.toLocaleDateString()}`;
  const filename = `dues-report-${now.toISOString().slice(0, 10)}`;
  const section = {
    heading: "Dues by Flat",
    headers: [
      "Flat",
      "Member",
      "Months Unpaid",
      "Unpaid Periods",
      "Maintenance Due (Rs.)",
      "Other Charges Due (Rs.)",
      "Total Due (Rs.)",
    ],
    rows,
    colWeights: [1.2, 1.2, 0.8, 2.4, 1.2, 1.3, 1.1],
  };

  if (format === "pdf") {
    const buffer = await buildPdfReport(title, [section]);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  }

  const buffer = await buildExcelReport([{ sheetName: "Dues", headers: section.headers, rows: section.rows }]);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}
