import { monthParam } from "@/lib/utils";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getFinancialOverview } from "@/lib/finance";
import { getSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MonthYearPicker } from "./month-year-picker";

// First year the app holds data for; the year dropdown runs from here to the current year.
const FIRST_YEAR = 2026;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function MemberMonthlyDataPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile?.buildingId) redirect("/member");

  const settings = await getSettings(profile.buildingId);
  if (!settings.allowMembersViewFinancials) redirect("/member");

  const params = await searchParams;
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const requestedYear = Number(params.year);
  const year = requestedYear >= FIRST_YEAR && requestedYear <= thisYear ? requestedYear : thisYear;
  // No future months: in the current year, anything after this month falls back to this month.
  const month = year === thisYear ? Math.min(monthParam(params.month), thisMonth) : monthParam(params.month);
  const overview = await getFinancialOverview(profile.buildingId, { month, year });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Monthly Data</h1>
        <p className="text-muted-foreground">
          {overview.settings.buildingName} · Building-wide totals — individual residents&apos; payments are not shown here.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {MONTH_NAMES[month - 1]} {year}
          </CardTitle>
          <MonthYearPicker
            key={`${month}-${year}`}
            month={month}
            year={year}
            thisMonth={thisMonth}
            thisYear={thisYear}
            firstYear={FIRST_YEAR}
          />
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
                  <TableCell>{t.date.toLocaleDateString("en-IN")}</TableCell>
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
