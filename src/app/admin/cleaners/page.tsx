import { monthParam } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/building-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CleanerDialog } from "./cleaner-dialog";
import { CleanerPaymentsDialog } from "./payments-dialog";
import { deleteCleaner } from "./actions";
import { cleanerMonth } from "@/lib/cleaner-advance";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function CleanersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const { buildingId } = await requireAdminContext();
  const params = await searchParams;
  const now = new Date();
  const month = monthParam(params.month);
  const year = Number(params.year) || now.getFullYear();

  const cleaners = await prisma.cleaner.findMany({
    where: { buildingId },
    orderBy: { createdAt: "asc" },
    include: {
      salaryHistory: true,
      // Every month, so advances paid earlier can be carried into this one.
      payments: { include: { entries: { orderBy: { paymentDate: "asc" } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Cleaners</h1>
        <CleanerDialog trigger={<Button>Add Cleaner</Button>} />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>
            Salary — {MONTH_NAMES[month - 1]} {year}
          </CardTitle>
          <form method="get" className="flex flex-wrap items-end gap-2">
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Advance used</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cleaners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No cleaners added yet.
                  </TableCell>
                </TableRow>
              )}
              {cleaners.map((cleaner) => {
                const { due, carriedIn, paid, carriedOut, status } = cleanerMonth(
                  cleaner.salaryHistory.map((h) => ({
                    amount: Number(h.amount),
                    effectiveMonth: h.effectiveMonth,
                    effectiveYear: h.effectiveYear,
                  })),
                  cleaner.payments.flatMap((p) => p.entries.map((e) => ({ month: p.month, year: p.year, amount: Number(e.amount) }))),
                  month,
                  year,
                );
                const entries = cleaner.payments.find((p) => p.month === month && p.year === year)?.entries ?? [];
                return (
                  <TableRow key={cleaner.id}>
                    <TableCell>{cleaner.name}</TableCell>
                    <TableCell>₹{due.toFixed(2)}</TableCell>
                    <TableCell>{carriedIn > 0 ? `₹${Math.min(carriedIn, due).toFixed(2)}` : "—"}</TableCell>
                    <TableCell>
                      ₹{paid.toFixed(2)}
                      {carriedOut > 0 && (
                        <span className="block text-xs text-muted-foreground">₹{carriedOut.toFixed(2)} extra → next month</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status === "PAID" ? "default" : status === "PARTIAL" ? "outline" : "secondary"}>
                        {status === "PAID" ? "Paid" : status === "PARTIAL" ? "Partial" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <CleanerPaymentsDialog
                          cleanerName={cleaner.name}
                          cleanerId={cleaner.id}
                          month={month}
                          year={year}
                          due={due}
                          paid={paid}
                          carriedIn={carriedIn}
                          entries={entries.map((e) => ({
                            id: e.id,
                            amount: e.amount.toString(),
                            paymentDate: e.paymentDate.toISOString(),
                            paymentMethod: e.paymentMethod,
                            notes: e.notes,
                          }))}
                          trigger={
                            <Button variant="outline" size="sm">
                              Payments
                            </Button>
                          }
                        />
                        <CleanerDialog
                          cleaner={{
                            id: cleaner.id,
                            name: cleaner.name,
                            monthlySalary: cleaner.monthlySalary.toString(),
                          }}
                          trigger={
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          }
                        />
                        <ConfirmDeleteButton
                          id={cleaner.id}
                          action={deleteCleaner}
                          confirmMessage={`Delete ${cleaner.name}? This also removes their payment history.`}
                        />
                      </div>
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
