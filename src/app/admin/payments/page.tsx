import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkPaidDialog } from "./mark-paid-dialog";
import { markPaymentUnpaid } from "./actions";
import { rateForMonth } from "@/lib/rate-history";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = Number(params.month) || now.getMonth() + 1;
  const year = Number(params.year) || now.getFullYear();

  const flats = await prisma.flat.findMany({
    orderBy: [{ floor: { sortOrder: "asc" } }, { flatNumber: "asc" }],
    include: {
      floor: true,
      member: true,
      payments: { where: { month, year } },
      maintenanceRates: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Maintenance Payments</h1>
        <form method="get" className="flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Month</label>
            <select
              name="month"
              defaultValue={month}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Year</label>
            <Input name="year" type="number" defaultValue={year} className="w-24" />
          </div>
          <Button type="submit" variant="outline">
            View
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {MONTH_NAMES[month - 1]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flat</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No flats set up yet.
                  </TableCell>
                </TableRow>
              )}
              {flats.map((flat) => {
                const payment = flat.payments[0];
                const isPaid = payment?.status === "PAID";
                const rate = rateForMonth(
                  flat.maintenanceRates.map((r) => ({
                    amount: Number(r.amount),
                    effectiveMonth: r.effectiveMonth,
                    effectiveYear: r.effectiveYear,
                  })),
                  month,
                  year,
                );
                return (
                  <TableRow key={flat.id}>
                    <TableCell>
                      <Link href={`/admin/payments/${flat.id}`} className="hover:underline">
                        {flat.floor.name} / {flat.flatNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{flat.member?.name ?? "Unassigned"}</TableCell>
                    <TableCell>₹{rate.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={isPaid ? "default" : "secondary"}>
                        {isPaid ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment?.paymentDate ? payment.paymentDate.toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPaid ? (
                        <form action={markPaymentUnpaid} className="inline">
                          <input type="hidden" name="flatId" value={flat.id} />
                          <input type="hidden" name="month" value={month} />
                          <input type="hidden" name="year" value={year} />
                          <Button variant="outline" size="sm" type="submit">
                            Mark Unpaid
                          </Button>
                        </form>
                      ) : (
                        <MarkPaidDialog
                          flatId={flat.id}
                          month={month}
                          year={year}
                          defaultAmount={rate.toFixed(2)}
                        />
                      )}
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
