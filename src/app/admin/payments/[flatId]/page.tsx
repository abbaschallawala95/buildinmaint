import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { AddChargeDialog } from "./add-charge-dialog";
import { MarkChargePaidDialog } from "./mark-charge-paid-dialog";
import { deleteCharge } from "../actions";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function FlatPaymentHistoryPage({
  params,
}: {
  params: Promise<{ flatId: string }>;
}) {
  const { flatId } = await params;

  const flat = await prisma.flat.findUnique({
    where: { id: flatId },
    include: {
      floor: true,
      member: true,
      payments: { orderBy: [{ year: "desc" }, { month: "desc" }] },
      additionalCharges: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!flat) notFound();

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
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
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flat.payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {flat.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </TableCell>
                  <TableCell>₹{p.amount.toString()}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "PAID" ? "default" : "secondary"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>{p.paymentDate ? p.paymentDate.toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{p.paymentMethod ?? "—"}</TableCell>
                  <TableCell>{p.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Additional Charges & Other Dues</CardTitle>
          <AddChargeDialog flatId={flat.id} />
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
                  <TableCell>{c.dueDate ? c.dueDate.toLocaleDateString() : "—"}</TableCell>
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
