import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/building-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { AddChargeDialog } from "./add-charge-dialog";
import { PreviousDuesDialog } from "./previous-dues-dialog";
import { MarkChargePaidDialog } from "./mark-charge-paid-dialog";
import { deleteCharge } from "../actions";
import { buildDueSchedule, totalDue } from "@/lib/maintenance-dues";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function FlatPaymentHistoryPage({
  params,
}: {
  params: Promise<{ flatId: string }>;
}) {
  const { buildingId } = await requireAdminContext();
  const { flatId } = await params;

  const flat = await prisma.flat.findFirst({
    where: { id: flatId, floor: { buildingId } },
    include: {
      floor: true,
      member: true,
      payments: { orderBy: [{ year: "desc" }, { month: "desc" }] },
      additionalCharges: { orderBy: { createdAt: "desc" } },
      maintenanceRates: true,
    },
  });
  if (!flat) notFound();

  const now = new Date();
  const schedule = buildDueSchedule(
    flat.maintenanceRates.map((r) => ({
      amount: Number(r.amount),
      effectiveMonth: r.effectiveMonth,
      effectiveYear: r.effectiveYear,
    })),
    flat.payments.map((p) => ({
      month: p.month,
      year: p.year,
      status: p.status,
      amount: Number(p.amount),
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
    })),
    now.getMonth() + 1,
    now.getFullYear(),
  ).reverse();
  const dueTotal = totalDue(schedule);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/payments" className="text-sm text-muted-foreground hover:underline">
          ← Back to Payments
        </Link>
        <h1 className="text-2xl font-semibold">
          {flat.floor.name} / {flat.flatNumber}
        </h1>
        <p className="text-muted-foreground">
          {flat.member ? flat.member.name : "Unassigned"} · ₹{flat.monthlyMaintenanceAmount.toString()}
          /month
        </p>
        <p className="mt-1 text-lg font-semibold">Total Due: ₹{dueTotal.toFixed(2)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History (since {MONTH_NAMES[schedule[schedule.length - 1]?.month - 1] ?? ""} {schedule[schedule.length - 1]?.year ?? ""})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No maintenance rate set for this flat yet.
                  </TableCell>
                </TableRow>
              )}
              {schedule.map((p) => (
                <TableRow key={`${p.month}-${p.year}`}>
                  <TableCell>
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </TableCell>
                  <TableCell>₹{p.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "PAID" ? "default" : "secondary"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>{p.paymentDate ? p.paymentDate.toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell>{p.paymentMethod ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Additional Charges & Other Dues</CardTitle>
          <div className="flex gap-2">
            <PreviousDuesDialog flatId={flat.id} />
            <AddChargeDialog flatId={flat.id} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flat.additionalCharges.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No additional charges.
                  </TableCell>
                </TableRow>
              )}
              {flat.additionalCharges.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.description}</TableCell>
                  <TableCell>₹{c.amount.toString()}</TableCell>
                  <TableCell>{c.dueDate ? c.dueDate.toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "PAID" ? "default" : "secondary"}>
                      {c.status === "PAID" ? "Paid" : "Unpaid"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {c.status !== "PAID" && <MarkChargePaidDialog id={c.id} flatId={flat.id} />}
                      <ConfirmDeleteButton
                        id={c.id}
                        action={deleteCharge}
                        confirmMessage="Delete this charge?"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
