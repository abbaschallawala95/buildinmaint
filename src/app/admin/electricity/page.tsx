import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/building-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { BillDialog } from "./bill-dialog";
import { MarkBillPaidDialog } from "./mark-paid-dialog";
import { MarkUnpaidButton } from "./mark-unpaid-button";
import { createBillCategory, deleteBill, deleteBillCategory, renameBillCategory } from "./actions";
import { CategoriesDialog } from "@/components/categories-dialog";
import { ensureDefaultElectricityCategories } from "@/lib/electricity-categories";

export default async function ElectricityPage() {
  const { buildingId } = await requireAdminContext();
  await ensureDefaultElectricityCategories(buildingId);
  const [bills, categories] = await Promise.all([
    prisma.electricityBill.findMany({ where: { buildingId }, include: { category: true }, orderBy: { dueDate: "desc" } }),
    prisma.electricityBillCategory.findMany({
      where: { buildingId },
      orderBy: { name: "asc" },
      include: { _count: { select: { bills: true } } },
    }),
  ]);
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Electricity Bills</h1>
        <div className="flex gap-2">
          <CategoriesDialog
            title="Electricity Bill Categories"
            categories={categories.map((c) => ({ id: c.id, name: c.name, useCount: c._count.bills }))}
            createAction={createBillCategory}
            renameAction={renameBillCategory}
            deleteAction={deleteBillCategory}
          />
          <BillDialog categories={categoryOptions} trigger={<Button>Add Bill</Button>} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Billing Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No bills logged yet.
                  </TableCell>
                </TableRow>
              )}
              {bills.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.category.name}</TableCell>
                  <TableCell>
                    {b.billingPeriodStart.toLocaleDateString("en-IN")} –{" "}
                    {b.billingPeriodEnd.toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell>₹{b.amount.toString()}</TableCell>
                  <TableCell>{b.dueDate.toLocaleDateString("en-IN")}</TableCell>
                  <TableCell>
                    <Badge variant={b.status === "PAID" ? "default" : "secondary"}>
                      {b.status === "PAID" ? "Paid" : "Unpaid"}
                    </Badge>
                  </TableCell>
                  <TableCell>{b.paymentDate ? b.paymentDate.toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {b.status === "PAID" ? (
                        <MarkUnpaidButton id={b.id} />
                      ) : (
                        <MarkBillPaidDialog id={b.id} />
                      )}
                      <BillDialog
                        categories={categoryOptions}
                        bill={{
                          id: b.id,
                          categoryId: b.categoryId,
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
