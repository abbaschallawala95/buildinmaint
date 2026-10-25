import "server-only";
import { prisma } from "@/lib/prisma";
import { rateForMonth } from "@/lib/rate-history";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const R = 50;
const CIRC = 2 * Math.PI * R;

// Bento theme: this month's maintenance collection as a ring, with the flats still to pay
// as chips beside it for follow-up.
export async function CollectionRing({ buildingId, month, year }: { buildingId: string; month: number; year: number }) {
  const flats = await prisma.flat.findMany({
    where: { floor: { buildingId }, maintenanceRates: { some: {} } },
    orderBy: [{ floor: { sortOrder: "asc" } }, { flatNumber: "asc" }],
    include: { floor: true, maintenanceRates: true, payments: { where: { month, year } } },
  });

  let expected = 0;
  let collected = 0;
  const unpaid: { id: string; label: string; title: string }[] = [];
  for (const f of flats) {
    expected += rateForMonth(
      f.maintenanceRates.map((r) => ({ amount: Number(r.amount), effectiveMonth: r.effectiveMonth, effectiveYear: r.effectiveYear })),
      month,
      year,
    );
    const paid = f.payments.find((p) => p.status === "PAID");
    if (paid) collected += Number(paid.amount);
    else unpaid.push({ id: f.id, label: f.flatNumber, title: `${f.floor.name} / ${f.flatNumber}` });
  }
  const pct = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
  const monthName = MONTHS[month - 1];

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      <div className="relative flex flex-col items-center justify-center rounded-[1.75rem] bg-[#1C1633] p-5 text-center text-white sm:row-span-2">
        <div className="relative">
          <svg viewBox="0 0 120 120" className="size-44 -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r={R} fill="none" stroke="rgb(255 255 255 / 12%)" strokeWidth="14" />
            <circle cx="60" cy="60" r={R} fill="none" stroke="#DCD3FF" strokeWidth="14" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct / 100)} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-4xl font-extrabold">{pct}%</span>
        </div>
        <p className="mt-2 text-sm text-white/70">Collected for {monthName}</p>
        <p className="text-lg font-semibold">{rupees(collected)} of {rupees(expected)}</p>
      </div>

      <div className="rounded-[1.75rem] bg-[#FFF1B8] p-5 text-[#1C1633] lg:col-span-2">
        <p className="text-sm font-medium text-[#1C1633]/65">Not paid for {monthName}</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight">
          {unpaid.length === 0 ? "Everyone has paid 🎉" : `${unpaid.length} flat${unpaid.length === 1 ? "" : "s"}`}
        </p>
        {unpaid.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {unpaid.map((u) => (
              <span key={u.id} title={u.title} className="rounded-full bg-[#1C1633] px-2.5 py-1 font-mono text-xs text-white">
                {u.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[1.75rem] bg-[#CDEFD9] p-5 text-[#1C1633]">
        <p className="text-sm font-medium text-[#1C1633]/65">Paid for {monthName}</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight">{flats.length - unpaid.length} of {flats.length} flats</p>
      </div>
      <div className="rounded-[1.75rem] bg-[#FFD9C7] p-5 text-[#1C1633]">
        <p className="text-sm font-medium text-[#1C1633]/65">Still to collect</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight">{rupees(Math.max(0, expected - collected))}</p>
      </div>
    </div>
  );
}
