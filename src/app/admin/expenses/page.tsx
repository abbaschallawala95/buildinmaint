import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/building-context";
import { ensureDefaultExpenseCategories } from "@/lib/expense-categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ExpenseDialog } from "./expense-dialog";
import { CategoriesDialog } from "./categories-dialog";
import { deleteExpense } from "./actions";

export default async function ExpensesPage() {
  const { buildingId } = await requireAdminContext();
  await ensureDefaultExpenseCategories(buildingId);

  const [expenses, categories] = await Promise.all([
    prisma.expense.findMany({ where: { buildingId }, include: { category: true }, orderBy: { date: "desc" } }),
    prisma.expenseCategory.findMany({
      where: { buildingId },
      orderBy: { name: "asc" },
      include: { _count: { select: { expenses: true } } },
    }),
  ]);

  const totalThisYear = expenses
    .filter((e) => e.date.getFullYear() === new Date().getFullYear())
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            ₹{totalThisYear.toLocaleString()} logged this year
          </p>
        </div>
        <div className="flex gap-2">
          <CategoriesDialog
            categories={categories.map((c) => ({ id: c.id, name: c.name, expenseCount: c._count.expenses }))}
          />
          <ExpenseDialog categories={categories} trigger={<Button>Add Expense</Button>} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No expenses logged yet.
                  </TableCell>
                </TableRow>
              )}
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.date.toLocaleDateString("en-IN")}</TableCell>
                  <TableCell>{e.category.name}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>₹{e.amount.toString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ExpenseDialog
                        categories={categories}
                        expense={{
                          id: e.id,
                          categoryId: e.categoryId,
                          description: e.description,
                          amount: e.amount.toString(),
                          date: e.date.toISOString().slice(0, 10),
                        }}
                        trigger={
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        }
                      />
                      <ConfirmDeleteButton
                        id={e.id}
                        action={deleteExpense}
                        confirmMessage="Delete this expense record?"
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
