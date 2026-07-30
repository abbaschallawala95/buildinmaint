import { redirect } from "next/navigation";
import { getFinancialOverview } from "@/lib/finance";
import { getSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function MemberMonthlyDataPage() {
  const settings = await getSettings();
  if (!settings.allowMembersViewFinancials) redirect("/member");

  const now = new Date();
  const overview = await getFinancialOverview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Monthly Data</h1>
        <p className="text-muted-foreground">
          {overview.settings.buildingName} · Building-wide totals — individual residents&apos; payments are not shown here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Income This Month</p>
              <p className="text-2xl font-semibold">₹{overview.monthIncome.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expenses This Month</p>
              <p className="text-2xl font-semibold">₹{overview.monthExpenses.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All-Time Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Opening Balance</p>
              <p className="text-lg font-semibold">₹{overview.openingBalance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Income</p>
              <p className="text-lg font-semibold">₹{overview.totalIncome.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="text-lg font-semibold">₹{overview.totalOutgoing.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Closing Balance</p>
              <p className="text-lg font-semibold">₹{overview.closingBalance.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This Month&apos;s Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.monthTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No transactions this month.
                  </TableCell>
                </TableRow>
              )}
              {overview.monthTransactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.date.toLocaleDateString()}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell
                    className={`text-right ${t.kind === "income" ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {t.kind === "income" ? "+" : "-"}₹{t.amount.toLocaleString()}
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
