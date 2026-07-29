import { Wallet, AlertCircle, Building2, Layers, Users, PiggyBank, TrendingDown, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getFinancialOverview } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function AdminDashboardPage() {
  const now = new Date();
  const overview = await getFinancialOverview();

  const [floorCount, flatCount, memberCount] = await Promise.all([
    prisma.floor.count(),
    prisma.flat.count(),
    prisma.profile.count({ where: { role: "MEMBER" } }),
  ]);

  const stats: { label: string; value: string | number; icon: LucideIcon; tone: string }[] = [
    {
      label: "Closing Balance",
      value: `₹${overview.closingBalance.toLocaleString()}`,
      icon: Landmark,
      tone: "text-primary bg-primary/10",
    },
    {
      label: "Total Income (All Time)",
      value: `₹${overview.totalIncome.toLocaleString()}`,
      icon: PiggyBank,
      tone: "text-emerald-600 bg-emerald-500/10",
    },
    {
      label: "Total Expenses (All Time)",
      value: `₹${overview.totalOutgoing.toLocaleString()}`,
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {overview.settings.buildingName} · {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
        </p>
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

        <Card>
          <CardHeader>
            <CardTitle>Overdue ({overdueCount})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueCount === 0 && <p className="text-sm text-muted-foreground">Nothing overdue.</p>}
            {overview.overdueBills.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <span>{b.type === "LIFT" ? "Lift" : "Common Area"} Electricity Bill</span>
                <Badge variant="secondary">₹{b.amount.toString()} due {b.dueDate.toLocaleDateString()}</Badge>
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
