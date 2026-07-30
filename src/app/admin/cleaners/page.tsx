import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CleanerDialog } from "./cleaner-dialog";
import { MarkCleanerPaidDialog } from "./mark-paid-dialog";
import { deleteCleaner, markCleanerUnpaid } from "./actions";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function CleanersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = Number(params.month) || now.getMonth() + 1;
  const year = Number(params.year) || now.getFullYear();

  const cleaners = await prisma.cleaner.findMany({
    orderBy: { createdAt: "asc" },
    include: { payments: { where: { month, year } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cleaners</h1>
        <CleanerDialog trigger={<Button>Add Cleaner</Button>} />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>
            Salary — {MONTH_NAMES[month - 1]} {year}
          </CardTitle>
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Monthly Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cleaners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No cleaners added yet.
                  </TableCell>
                </TableRow>
              )}
              {cleaners.map((cleaner) => {
                const payment = cleaner.payments[0];
                const isPaid = payment?.status === "PAID";
                return (
                  <TableRow key={cleaner.id}>
                    <TableCell>{cleaner.name}</TableCell>
                    <TableCell>₹{cleaner.monthlySalary.toString()}</TableCell>
                    <TableCell>
                      <Badge variant={isPaid ? "default" : "secondary"}>
                        {isPaid ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment?.paymentDate ? payment.paymentDate.toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {isPaid ? (
                          <form action={markCleanerUnpaid} className="inline">
                            <input type="hidden" name="cleanerId" value={cleaner.id} />
                            <input type="hidden" name="month" value={month} />
                            <input type="hidden" name="year" value={year} />
                            <Button variant="outline" size="sm" type="submit">
                              Mark Unpaid
                            </Button>
                          </form>
                        ) : (
                          <MarkCleanerPaidDialog
                            cleanerId={cleaner.id}
                            month={month}
                            year={year}
                            defaultAmount={cleaner.monthlySalary.toString()}
                          />
                        )}
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
