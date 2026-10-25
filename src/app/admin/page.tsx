import { monthParam } from "@/lib/utils";
import Link from "next/link";
import { Wallet, AlertCircle, Building2, Layers, Users, PiggyBank, TrendingDown, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/building-context";
import { getFinancialOverview } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { themeOf } from "@/lib/themes";
import { DuesCalendar } from "@/components/theme-widgets/dues-calendar";
import { Noticeboard } from "@/components/theme-widgets/noticeboard";
import { CollectionRing } from "@/components/theme-widgets/collection-ring";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const { buildingId } = await requireAdminContext();
  const params = await searchParams;
  const now = new Date();
  const isFiltered = Boolean(params.month || params.year);
  const month = monthParam(params.month);
  const year = Number(params.year) || now.getFullYear();
  const [overview, floorCount, flatCount, memberCount] = await Promise.all([
    getFinancialOverview(buildingId, isFiltered ? { month, year } : undefined),
    prisma.floor.count({ where: { buildingId } }),
    prisma.flat.count({ where: { floor: { buildingId } } }),
    prisma.profile.count({ where: { role: "MEMBER", buildingId } }),
  ]);
  const widgets: readonly string[] = themeOf(overview.settings.theme).widgets;

  const incomeLabel = isFiltered
    ? `Income (${MONTH_NAMES[month - 1]} ${year})`
    : "Total Income (All Time)";
  const expenseLabel = isFiltered
    ? `Expenses (${MONTH_NAMES[month - 1]} ${year})`
    : "Total Expenses (All Time)";
  const incomeValue = isFiltered ? overview.monthIncome : overview.totalIncome;
  const expenseValue = isFiltered ? overview.monthExpenses : overview.totalOutgoing;

  const stats: { label: string; value: string | number; icon: LucideIcon; tone: string }[] = [
    {
      label: "Closing Balance",
      value: `₹${overview.closingBalance.toLocaleString()}`,
      icon: Landmark,
      tone: "text-primary bg-primary/10",
    },
    {
      label: incomeLabel,
      value: `₹${incomeValue.toLocaleString()}`,
      icon: PiggyBank,
      tone: "text-emerald-600 bg-emerald-500/10",
    },
    {
      label: expenseLabel,
      value: `₹${expenseValue.toLocaleString()}`,
      icon: TrendingDown,
      tone: "text-rose-600 bg-rose-500/10",
    },
    {
      label: "Outstanding Dues",
      value: `₹${overview.outstandingDues.toLocaleString()}`,
      icon: AlertCircle,
      tone: "text-amber-600 bg-amber-500/10",
    },
  ];

  const counts: { label: string; value: number; icon: LucideIcon }[] = [
    { label: "Total Flats", value: flatCount, icon: Building2 },
    { label: "Total Floors", value: floorCount, icon: Layers },
    { label: "Registered Members", value: memberCount, icon: Users },
  ];

  const overdueCount = overview.overdueBills.length + overview.overdueCharges.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {overview.settings.buildingName} ·{" "}
            {isFiltered ? `${MONTH_NAMES[month - 1]} ${year}` : "All time"}
          </p>
        </div>
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
          <Link
            href={`/admin?month=${now.getMonth() + 1}&year=${now.getFullYear()}`}
            className={buttonVariants({ variant: "ghost" })}
          >
            This Month
          </Link>
          {isFiltered && (
            <Link href="/admin" className={buttonVariants({ variant: "ghost" })}>
              All Time
            </Link>
          )}
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="gap-3 py-5">
            <CardContent className="flex items-start justify-between px-5">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
              </div>
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${s.tone}`}>
                <s.icon className="size-4.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {counts.map((s) => (
          <Card key={s.label} className="gap-3 py-5">
            <CardContent className="flex items-center justify-between px-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="text-xl font-semibold">{s.value}</p>
              </div>
              <s.icon className="size-4.5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
        <Card className="gap-3 py-5">
          <CardContent className="flex items-center justify-between px-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pending This Month</p>
              <p className="text-xl font-semibold">
                ₹{overview.pendingMaintenanceThisMonth.toLocaleString()}
              </p>
            </div>
            <Wallet className="size-4.5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Theme extras (Ledger / Courtyard / Bento); every other section is the same for all themes */}
      {widgets.includes("dues-calendar") && <DuesCalendar buildingId={buildingId} year={year} />}
      {widgets.includes("noticeboard") && <Noticeboard buildingId={buildingId} month={month} year={year} />}
      {widgets.includes("collection-ring") && <CollectionRing buildingId={buildingId} month={month} year={year} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
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
                {overview.recentTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No transactions yet.
                    </TableCell>
                  </TableRow>
                )}
                {overview.recentTransactions.map((t) => (
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

        <Card>
          <CardHeader>
            <CardTitle>Overdue ({overdueCount})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueCount === 0 && <p className="text-sm text-muted-foreground">Nothing overdue.</p>}
            {overview.overdueBills.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <span>{b.type === "LIFT" ? "Lift" : "Common Area"} Electricity Bill</span>
                <Badge variant="secondary">₹{b.amount.toString()} due {b.dueDate.toLocaleDateString("en-IN")}</Badge>
              </div>
            ))}
            {overview.overdueCharges.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span>
                  {c.description} — {c.flat.floor.name}/{c.flat.flatNumber}
                </span>
                <Badge variant="secondary">₹{c.amount.toString()}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
