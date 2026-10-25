import "server-only";
import { prisma } from "@/lib/prisma";
import { buildDueSchedule, totalDue } from "@/lib/maintenance-dues";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Note = { title: string; body: string; tag: string; tone: "alert" | "ok" };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const NOTE_STYLE = ["-rotate-2 bg-[#FFFDF2]", "rotate-[1.5deg] bg-[#FFF1D6]", "-rotate-1 bg-[#E8F4E4]"];
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const date = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// Courtyard theme: the lobby noticeboard (what needs attention, from real data) and a
// letterbox wall of every flat coloured by this month's maintenance status.
export async function Noticeboard({ buildingId, month, year }: { buildingId: string; month: number; year: number }) {
  const now = new Date();
  const [flats, overdueBills, latestCharge] = await Promise.all([
    prisma.flat.findMany({
      where: { floor: { buildingId } },
      orderBy: [{ floor: { sortOrder: "desc" } }, { flatNumber: "asc" }],
      include: { floor: true, member: true, payments: true, maintenanceRates: true },
    }),
    prisma.electricityBill.findMany({ where: { buildingId, status: "UNPAID", dueDate: { lt: now } }, orderBy: { dueDate: "asc" }, take: 1 }),
    prisma.additionalCharge.findFirst({ where: { flat: { floor: { buildingId } } }, orderBy: { createdAt: "desc" } }),
  ]);

  const notes: Note[] = [];
  const bill = overdueBills[0];
  if (bill) {
    const days = Math.max(1, Math.floor((now.getTime() - bill.dueDate.getTime()) / 86_400_000));
    notes.push({
      title: `${bill.type === "LIFT" ? "Lift" : "Common area"} bill`,
      body: `${rupees(Number(bill.amount))} was due on ${date(bill.dueDate)} and is still unpaid.`,
      tag: `${days} day${days === 1 ? "" : "s"} overdue`,
      tone: "alert",
    });
  }

  const behind = flats
    .map((f) => {
      const schedule = buildDueSchedule(
        f.maintenanceRates.map((r) => ({ amount: Number(r.amount), effectiveMonth: r.effectiveMonth, effectiveYear: r.effectiveYear })),
        f.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
        now.getMonth() + 1,
        now.getFullYear(),
      );
      return { f, months: schedule.filter((s) => s.status === "UNPAID").length, owed: totalDue(schedule) };
    })
    .sort((a, b) => b.months - a.months)[0];
  if (behind && behind.months >= 2) {
    notes.push({
      title: `Flat ${behind.f.flatNumber}`,
      body: `${behind.f.member?.name ?? "This flat"} has ${behind.months} unpaid months, ${rupees(behind.owed)} in total.`,
      tag: `${behind.months} months behind`,
      tone: "alert",
    });
  }

  if (latestCharge) {
    const group = await prisma.additionalCharge.findMany({
      where: { description: latestCharge.description, flat: { floor: { buildingId } } },
      select: { status: true, amount: true },
    });
    const paid = group.filter((c) => c.status === "PAID").length;
    notes.push({
      title: latestCharge.description,
      body: `${rupees(Number(latestCharge.amount))} per flat. ${paid} of ${group.length} flat${group.length === 1 ? " has" : "s have"} paid so far.`,
      tag: paid === group.length ? "All collected" : "Collecting",
      tone: "ok",
    });
  }
  if (notes.length === 0) notes.push({ title: "All clear", body: "Nothing needs attention right now.", tag: "Up to date", tone: "ok" });

  const wall = flats.map((f) => {
    const p = f.payments.find((x) => x.month === month && x.year === year);
    return { id: f.id, label: f.flatNumber, title: `${f.floor.name} / ${f.flatNumber}`, paid: p?.status === "PAID", hasRate: f.maintenanceRates.length > 0 };
  });
  const paidCount = wall.filter((w) => w.paid).length;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="grid min-h-56 grid-cols-1 gap-5 rounded-[1.25rem] bg-[#B9875A] bg-[radial-gradient(#a0724a_0.7px,transparent_0.7px)] bg-[size:6px_6px] p-6 sm:grid-cols-3">
        {notes.slice(0, 3).map((n, i) => (
          <div key={n.title} className={`relative rounded-sm p-4 pt-5 text-sm text-[#1E3A2C] shadow-[0_8px_14px_-8px_rgba(0,0,0,0.45)] transition-transform hover:rotate-0 ${NOTE_STYLE[i]}`}>
            <span aria-hidden className="absolute -top-2.5 left-1/2 h-[18px] w-14 -translate-x-1/2 -rotate-3 bg-[#F0A43A]/55" />
            <p className="mb-1 font-heading text-base font-extrabold leading-tight">{n.title}</p>
            <p>{n.body}</p>
            <span className={`mt-2 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${n.tone === "alert" ? "bg-[#C4553D]" : "bg-[#4E8A5F]"}`}>
              {n.tag}
            </span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Who&apos;s paid for {MONTHS[month - 1]}</CardTitle>
          <span className="text-sm text-muted-foreground">{paidCount} of {wall.length} paid</span>
        </CardHeader>
        <CardContent>
          {wall.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flats set up yet.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {wall.map((w) => (
                <div
                  key={w.id}
                  title={`${w.title} · ${w.paid ? "paid" : w.hasRate ? "not paid yet" : "no maintenance set"}`}
                  className={`rounded-lg border px-1.5 pb-1.5 pt-2 text-center text-xs font-bold tabular-nums ${w.paid ? "bg-card" : "border-[#F0C3B7] bg-[#FBE9E4]"}`}
                >
                  <span className={`mx-1.5 mb-1.5 block h-1.5 rounded-full ${w.paid ? "bg-[#4E8A5F]" : w.hasRate ? "bg-[#C4553D]" : "bg-border"}`} />
                  {w.label}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
