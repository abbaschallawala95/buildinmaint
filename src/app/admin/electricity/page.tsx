import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { BillDialog } from "./bill-dialog";
import { MarkBillPaidDialog } from "./mark-paid-dialog";
import { MarkUnpaidButton } from "./mark-unpaid-button";
import { deleteBill } from "./actions";

const TYPE_LABEL = { LIFT: "Lift", COMMON_AREA: "Common Area" } as const;

export default async function ElectricityPage() {
  const bills = await prisma.electricityBill.findMany({ orderBy: { dueDate: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Electricity Bills</h1>
        <BillDialog trigger={<Button>Add Bill</Button>} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lift & Common Area Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Billing Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No bills logged yet.
                  </TableCell>
                </TableRow>
              )}
              {bills.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{TYPE_LABEL[b.type]}</TableCell>
                  <TableCell>
                    {b.billingPeriodStart.toLocaleDateString()} –{" "}
                    {b.billingPeriodEnd.toLocaleDateString()}
                  </TableCell>
                  <TableCell>₹{b.amount.toString()}</TableCell>
                  <TableCell>{b.dueDate.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={b.status === "PAID" ? "default" : "secondary"}>
                      {b.status === "PAID" ? "Paid" : "Unpaid"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {b.status === "PAID" ? (
                        <MarkUnpaidButton id={b.id} />
                      ) : (
                        <MarkBillPaidDialog id={b.id} />
                      )}
                      <BillDialog
                        bill={{
                          id: b.id,
                          type: b.type,
                          billingPeriodStart: b.billingPeriodStart.toISOString().slice(0, 10),
                          billingPeriodEnd: b.billingPeriodEnd.toISOString().slice(0, 10),
                          amount: b.amount.toString(),
                          dueDate: b.dueDate.toISOString().slice(0, 10),
                        }}
                        trigger={
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        }
                      />
                      <ConfirmDeleteButton
                        id={b.id}
                        action={deleteBill}
                        confirmMessage="Delete this electricity bill record?"
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
