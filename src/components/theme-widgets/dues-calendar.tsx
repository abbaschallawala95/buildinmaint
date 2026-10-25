import "server-only";
import { prisma } from "@/lib/prisma";
import { buildDueSchedule } from "@/lib/maintenance-dues";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LOOK = {
  PAID: { cls: "bg-emerald-500", label: "paid" },
  UNPAID: { cls: "bg-rose-400", label: "unpaid" },
  NOT_DUE: { cls: "bg-muted", label: "not due" },
} as const;

// Ledger theme: every flat × every month of the year, so skipped months stand out —
// uses the same schedule as Outstanding Dues and the Total Dues report.
export async function DuesCalendar({ buildingId, year }: { buildingId: string; year: number }) {
  const flats = await prisma.flat.findMany({
    where: { floor: { buildingId } },
    orderBy: [{ floor: { sortOrder: "asc" } }, { flatNumber: "asc" }],
    include: { floor: true, payments: true, maintenanceRates: true },
  });
  const now = new Date();
  const lastDueMonth = year < now.getFullYear() ? 12 : year > now.getFullYear() ? 0 : now.getMonth() + 1;

  const rows = flats.map((f) => {
    const schedule = buildDueSchedule(
      f.maintenanceRates.map((r) => ({ amount: Number(r.amount), effectiveMonth: r.effectiveMonth, effectiveYear: r.effectiveYear })),
      f.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
      Math.max(lastDueMonth, 1),
      year,
    );
    const byMonth = new Map(schedule.filter((s) => s.year === year).map((s) => [s.month, s.status]));
    return {
      id: f.id,
      label: f.flatNumber,
      title: `${f.floor.name} / ${f.flatNumber}`,
      cells: MONTHS.map((_, i) => (i + 1 <= lastDueMonth ? (byMonth.get(i + 1) ?? "NOT_DUE") : "NOT_DUE") as keyof typeof LOOK),
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Dues calendar · {year}</CardTitle>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {Object.values(LOOK).map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <i className={`inline-block size-2.5 rounded-sm ${l.cls}`} />
              {l.label[0].toUpperCase() + l.label.slice(1)}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No flats set up yet.</p>
        ) : (
          <div className="grid min-w-[520px] grid-cols-[72px_repeat(12,minmax(0,1fr))] items-center gap-1.5 text-xs">
            <span />
            {MONTHS.map((m) => (
              <span key={m} className="text-center font-medium text-muted-foreground">{m}</span>
            ))}
            {rows.map((r) => (
              <div key={r.id} className="contents">
                <span className="truncate font-medium tabular-nums" title={r.title}>{r.label}</span>
                {r.cells.map((c, i) => (
                  <span key={i} className={`h-6 rounded-[5px] ${LOOK[c].cls}`} title={`${r.title} · ${MONTHS[i]} ${year} · ${LOOK[c].label}`} />
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
