import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/building-context";
import { buildDueSchedule, splitUnpaidCharges, totalDue } from "@/lib/maintenance-dues";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PreviousDueDialog, type PreviousDue } from "./previous-due-dialog";
import { DueRowActions } from "./due-row-actions";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
const selectClass = "h-9 rounded-md border bg-background px-3 text-sm";

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ flat?: string; status?: string }>;
}) {
  const { buildingId } = await requireAdminContext();
  const params = await searchParams;
  const status = params.status === "paid" || params.status === "all" ? params.status : "unpaid";
  const now = new Date();

  const flats = await prisma.flat.findMany({
    where: { floor: { buildingId } },
    orderBy: [{ floor: { sortOrder: "asc" } }, { flatNumber: "asc" }],
    include: {
      floor: true,
      member: true,
      payments: true,
      maintenanceRates: true,
      additionalCharges: { orderBy: { createdAt: "desc" } },
    },
  });
  const flatOptions = flats.map((f) => ({ id: f.id, label: `${f.floor.name} / ${f.flatNumber}${f.member ? ` — ${f.member.name}` : ""}` }));
  const selectedFlat = flats.some((f) => f.id === params.flat) ? params.flat : "";

  const rows = flats.map((f) => {
    const monthly = totalDue(
      buildDueSchedule(
        f.maintenanceRates.map((r) => ({ amount: Number(r.amount), effectiveMonth: r.effectiveMonth, effectiveYear: r.effectiveYear })),
        f.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
        now.getMonth() + 1,
        now.getFullYear(),
      ),
    );
    const { previous, other } = splitUnpaidCharges(f.additionalCharges);
    return { flat: f, monthly, previous, other, total: monthly + previous + other };
  });
  const sum = (k: "monthly" | "previous" | "other" | "total") => rows.reduce((s, r) => s + r[k], 0);

  const dues = flats
    .flatMap((f) =>
      f.additionalCharges
        .filter((c) => c.previousDueType)
        .map((c) => ({ charge: c, flatLabel: `${f.floor.name} / ${f.flatNumber}`, member: f.member?.name })),
    )
    .filter(({ charge }) => !selectedFlat || charge.flatId === selectedFlat)
    .filter(({ charge }) => status === "all" || (status === "paid") === (charge.status === "PAID"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Maintenance Dues</h1>
          <p className="text-sm text-muted-foreground">
            What every flat still owes, and dues from before the app. Monthly payments are recorded under{" "}
            <Link href="/admin/payments" className="underline underline-offset-2">
              Payments
            </Link>
            .
          </p>
        </div>
        <PreviousDueDialog
          flats={flatOptions}
          trigger={
            <Button disabled={flats.length === 0}>
              <Plus className="size-4" aria-hidden /> Add previous due
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dues by flat</CardTitle>
          <p className="text-xs text-muted-foreground">Monthly maintenance counts unpaid months from when tracking started. Click a flat for its full history.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flat</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Monthly maintenance</TableHead>
                <TableHead className="text-right">Previous dues</TableHead>
                <TableHead className="text-right">Other charges</TableHead>
                <TableHead className="text-right">Total due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No flats set up yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map(({ flat, monthly, previous, other, total }) => (
                <TableRow key={flat.id}>
                  <TableCell>
                    <Link href={`/admin/payments/${flat.id}`} className="font-medium text-primary hover:underline">
                      {flat.floor.name} / {flat.flatNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{flat.member?.name ?? "Unassigned"}</TableCell>
                  <TableCell className="text-right">{monthly ? rupees(monthly) : "—"}</TableCell>
                  <TableCell className="text-right">{previous ? rupees(previous) : "—"}</TableCell>
                  <TableCell className="text-right">{other ? rupees(other) : "—"}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {total ? rupees(total) : <Badge variant="secondary">Clear</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold">
                    All flats
                  </TableCell>
                  <TableCell className="text-right font-semibold">{rupees(sum("monthly"))}</TableCell>
                  <TableCell className="text-right font-semibold">{rupees(sum("previous"))}</TableCell>
                  <TableCell className="text-right font-semibold">{rupees(sum("other"))}</TableCell>
                  <TableCell className="text-right font-semibold">{rupees(sum("total"))}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>Previous dues</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Amounts owed from before the app, for maintenance or anything else.</p>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label htmlFor="flat" className="text-xs text-muted-foreground">Flat</label>
              <select id="flat" name="flat" defaultValue={selectedFlat} className={selectClass}>
                <option value="">All flats</option>
                {flatOptions.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="status" className="text-xs text-muted-foreground">Status</label>
              <select id="status" name="status" defaultValue={status} className={selectClass}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="all">All</option>
              </select>
            </div>
            <Button type="submit" variant="outline">Filter</Button>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flat</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dues.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {status === "unpaid" ? "No unpaid previous dues." : "No previous dues found."}
                  </TableCell>
                </TableRow>
              )}
              {dues.map(({ charge: c, flatLabel, member }) => {
                const due: PreviousDue = {
                  id: c.id,
                  flatId: c.flatId,
                  type: c.previousDueType === "OTHER" ? "OTHER" : "MAINTENANCE",
                  description: c.description,
                  amount: c.amount.toString(),
                  dueDate: ymd(c.dueDate),
                  paid: c.status === "PAID",
                  paymentDate: ymd(c.paymentDate),
                };
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="font-medium">{flatLabel}</span>
                      {member && <span className="block text-xs text-muted-foreground">{member}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{due.type === "MAINTENANCE" ? "Maintenance" : "Other"}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.description}
                      {c.dueDate && <span className="block text-xs text-muted-foreground">Due {c.dueDate.toLocaleDateString("en-IN")}</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium">{rupees(Number(c.amount))}</TableCell>
                    <TableCell>
                      <Badge variant={due.paid ? "default" : "secondary"}>{due.paid ? "Paid" : "Unpaid"}</Badge>
                      {c.paymentDate && <span className="block text-xs text-muted-foreground">{c.paymentDate.toLocaleDateString("en-IN")}</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <DueRowActions due={due} flats={flatOptions} label={`${flatLabel} · ${c.description}`} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
