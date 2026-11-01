import { buildDueSchedule } from "@/lib/maintenance-dues";

// Everything each flat owes, item by item, for the Total Dues export (Excel + PDF).
// Pure (no DB) so scripts/check-dues-report.ts can test it.

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type FlatInput = {
  label: string;
  member: string;
  rates: Parameters<typeof buildDueSchedule>[0];
  payments: Parameters<typeof buildDueSchedule>[1];
  /** unpaid additional charges, previous dues included */
  charges: { description: string; amount: number; previousDueType: string | null }[];
};

const KIND_ORDER = ["MONTHLY", "PREVIOUS_MAINTENANCE", "OTHER"] as const;

export type DueItem = {
  kind: "MONTHLY" | "PREVIOUS_MAINTENANCE" | "OTHER";
  label: string;
  note: string;
  due: number;
};

export function buildDuesReport(flats: FlatInput[], uptoMonth: number, uptoYear: number) {
  const rows = flats.map((f) => {
    const items: DueItem[] = [];
    for (const s of buildDueSchedule(f.rates, f.payments, uptoMonth, uptoYear)) {
      if (s.remaining <= 0) continue;
      items.push({
        kind: "MONTHLY",
        label: `${MONTH_ABBR[s.month - 1]} ${s.year}`,
        note: s.status === "PARTIAL" ? `Partial: ${s.paid} paid of ${s.rate}` : "Unpaid",
        due: s.remaining,
      });
    }
    for (const c of f.charges) {
      const previousMaintenance = c.previousDueType === "MAINTENANCE";
      items.push({
        kind: previousMaintenance ? "PREVIOUS_MAINTENANCE" : "OTHER",
        label: c.description,
        note: c.previousDueType ? "Previous dues" : "Charge",
        due: c.amount,
      });
    }
    // Monthly first, then previous maintenance dues, then other dues (each in entry order).
    items.sort((p, q) => KIND_ORDER.indexOf(p.kind) - KIND_ORDER.indexOf(q.kind));
    const sum = (k: DueItem["kind"]) => items.filter((i) => i.kind === k).reduce((s, i) => s + i.due, 0);
    const monthly = sum("MONTHLY");
    const previousMaintenance = sum("PREVIOUS_MAINTENANCE");
    const other = sum("OTHER");
    return { label: f.label, member: f.member, items, monthly, previousMaintenance, other, total: monthly + previousMaintenance + other };
  });

  const all = rows.flatMap((r) => r.items);
  const other = new Map<string, number>();
  for (const i of all) if (i.kind === "OTHER") other.set(i.label, (other.get(i.label) ?? 0) + i.due);
  const monthlyBy = (partial: boolean) =>
    all.filter((i) => i.kind === "MONTHLY" && i.note.startsWith("Partial") === partial).reduce((s, i) => s + i.due, 0);

  return {
    flats: rows,
    totals: {
      unpaidMonths: monthlyBy(false),
      partialMonths: monthlyBy(true),
      previousMaintenance: rows.reduce((s, r) => s + r.previousMaintenance, 0),
      other: [...other].map(([name, amount]) => ({ name, amount })),
      grand: rows.reduce((s, r) => s + r.total, 0),
      flatsWithDues: rows.filter((r) => r.total > 0).length,
    },
  };
}

export type DuesReport = ReturnType<typeof buildDuesReport>;
