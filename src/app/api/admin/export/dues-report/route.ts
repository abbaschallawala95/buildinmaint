import { NextRequest } from "next/server";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { buildDuesReport } from "@/lib/dues-report";
import { buildDuesWorkbook } from "@/lib/export/dues-workbook";
import { buildPdfReport } from "@/lib/export/pdf";
import { todayValue } from "@/lib/utils";

const KIND = { MONTHLY: "Monthly maintenance", PREVIOUS_MAINTENANCE: "Previous dues - maintenance", OTHER: "Other dues" } as const;
const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  const [flats, building] = await Promise.all([
    prisma.flat.findMany({
      where: { floor: { buildingId } },
      orderBy: [{ floor: { sortOrder: "asc" } }, { flatNumber: "asc" }],
      include: {
        floor: true,
        member: true,
        payments: true,
        maintenanceRates: true,
        additionalCharges: { where: { status: "UNPAID" }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.building.findUnique({ where: { id: buildingId }, select: { name: true } }),
  ]);

  const report = buildDuesReport(
    flats.map((f) => ({
      label: `${f.floor.name} / ${f.flatNumber}`,
      member: f.member?.name ?? "Unassigned",
      rates: f.maintenanceRates.map((r) => ({ amount: Number(r.amount), effectiveMonth: r.effectiveMonth, effectiveYear: r.effectiveYear })),
      payments: f.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
      charges: f.additionalCharges.map((c) => ({ description: c.description, amount: Number(c.amount), previousDueType: c.previousDueType })),
    })),
    now.getMonth() + 1,
    now.getFullYear(),
  );
  const asOf = now.toLocaleDateString("en-IN");
  const buildingName = building?.name ?? "Building";
  const filename = `dues-report-${todayValue()}`;

  if (format === "pdf") {
    const { totals } = report;
    const otherTotal = totals.other.reduce((s, o) => s + o.amount, 0);
    const summaryRows = report.flats.map((f) => [
      f.label,
      f.member,
      rs(f.monthly),
      rs(f.previousMaintenance),
      rs(f.other),
      f.total > 0 ? rs(f.total) : "Clear",
    ]);
    summaryRows.push(["All flats", "", rs(report.flats.reduce((s, f) => s + f.monthly, 0)), rs(totals.previousMaintenance), rs(otherTotal), rs(totals.grand)]);

    const detailRows: string[][] = [];
    const detailTotals: number[] = [];
    for (const f of report.flats.filter((x) => x.total > 0)) {
      f.items.forEach((item, i) => detailRows.push([i === 0 ? `${f.label}, ${f.member}` : "", KIND[item.kind], item.label, item.note, rs(item.due)]));
      detailTotals.push(detailRows.length);
      detailRows.push(["", "", "", `Total for ${f.label}`, rs(f.total)]);
    }

    const totalRows = [
      ["Monthly maintenance", "Unpaid months", rs(totals.unpaidMonths)],
      ["Monthly maintenance", "Part-paid months (remaining)", rs(totals.partialMonths)],
      ["Previous dues - maintenance", "All previous maintenance dues", rs(totals.previousMaintenance)],
      ...totals.other.map((o) => ["Other dues", o.name, rs(o.amount)]),
      ["Grand total", `${totals.flatsWithDues} of ${report.flats.length} flat(s) with dues`, rs(totals.grand)],
    ];

    const buffer = await buildPdfReport(
      "Total Dues Report",
      [
        {
          heading: "Summary by flat",
          headers: ["Flat", "Member", "Monthly maintenance", "Previous maint. dues", "Other dues", "Total due"],
          rows: summaryRows,
          colWeights: [1.1, 1.2, 1.1, 1.1, 1, 1],
          rightAlign: [2, 3, 4, 5],
          totalRows: [summaryRows.length - 1],
        },
        {
          heading: "Dues in detail",
          headers: ["Flat", "Type", "Item", "Status", "Due"],
          rows: detailRows.length ? detailRows : [["Every flat is clear - nothing is due.", "", "", "", ""]],
          colWeights: [1.1, 1.2, 1.6, 1.4, 0.9],
          rightAlign: [4],
          totalRows: detailTotals,
        },
        {
          heading: "Totals",
          headers: ["Type", "Item", "Amount"],
          rows: totalRows,
          colWeights: [1.3, 2, 1],
          rightAlign: [2],
          totalRows: [totalRows.length - 1],
        },
      ],
      `${buildingName} - as of ${asOf}`,
    );
    return new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"` },
    });
  }

  const buffer = await buildDuesWorkbook(report, buildingName, asOf);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}
