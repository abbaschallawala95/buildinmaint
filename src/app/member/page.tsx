import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getFinancialOverview } from "@/lib/finance";
import { buildDueSchedule, totalDue } from "@/lib/maintenance-dues";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart3, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function MemberDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();

  const flat = await prisma.flat.findFirst({
    where: { memberId: profile!.id, floor: { buildingId: profile!.buildingId ?? undefined } },
    include: {
      floor: true,
      payments: { orderBy: [{ year: "desc" }, { month: "desc" }] },
      additionalCharges: { orderBy: { createdAt: "desc" } },
      maintenanceRates: true,
    },
  });

  if (!flat) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Flat Assigned</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You haven&apos;t been assigned to a flat yet. Contact your building admin.
          </p>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const currentPayment = flat.payments.find(
    (p) => p.month === now.getMonth() + 1 && p.year === now.getFullYear(),
  );
  const isCurrentPaid = currentPayment?.status === "PAID";
  const pendingCharges = flat.additionalCharges
    .filter((c) => c.status !== "PAID")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const schedule = buildDueSchedule(
    flat.maintenanceRates.map((r) => ({
      amount: Number(r.amount),
      effectiveMonth: r.effectiveMonth,
      effectiveYear: r.effectiveYear,
    })),
    flat.payments.map((p) => ({
      month: p.month,
      year: p.year,
      status: p.status,
      amount: Number(p.amount),
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
    })),
    now.getMonth() + 1,
    now.getFullYear(),
  ).reverse();
  const pendingAmount = totalDue(schedule) + pendingCharges;

  const years = [...new Set(schedule.map((s) => s.year))].sort((a, b) => b - a);
  const selectedYear = Number(params.year) || now.getFullYear();
  const yearSchedule = schedule.filter((s) => s.year === selectedYear);
  const yearDue = totalDue(yearSchedule);

  const [settings, sharedReports] = profile!.buildingId
    ? await Promise.all([
        getSettings(profile!.buildingId),
        prisma.sharedAnalytics.findMany({
          where: { buildingId: profile!.buildingId },
          orderBy: [{ year: "desc" }, { month: "desc" }],
        }),
      ])
    : [null, []];
  const overview =
    settings?.allowMembersViewFinancials && profile!.buildingId
      ? await getFinancialOverview(profile!.buildingId)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {flat.floor.name} / {flat.flatNumber} <span className="font-bold">— {profile!.name}</span>
        </h1>
        <p className="text-muted-foreground">
          Monthly Maintenance: ₹{flat.monthlyMaintenanceAmount.toString()}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {MONTH_NAMES[now.getMonth()]} {now.getFullYear()} Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={isCurrentPaid ? "default" : "secondary"} className="text-sm">
              {isCurrentPaid ? "Paid" : "Unpaid"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Total Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">₹{pendingAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Monthly Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              ₹{Number(flat.monthlyMaintenanceAmount).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {sharedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" aria-hidden /> Building analytics
            </CardTitle>
            <p className="text-sm text-muted-foreground">Shared by your building admin.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sharedReports.map((r) => (
              <Link
                key={r.id}
                href={`/member/analytics/${r.id}`}
                className="group flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:border-primary hover:bg-muted"
              >
                <div>
                  <p className="font-semibold">
                    {MONTH_NAMES[r.month - 1]} {r.year}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.sections.length} section{r.sections.length === 1 ? "" : "s"} · shared {r.sharedAt.toLocaleDateString("en-IN")}
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment History</CardTitle>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Year</label>
              <select
                name="year"
                defaultValue={selectedYear}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
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
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearSchedule.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No dues recorded for {selectedYear}.
                  </TableCell>
                </TableRow>
              )}
              {yearSchedule.map((p) => (
                <TableRow key={`${p.month}-${p.year}`}>
                  <TableCell>
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </TableCell>
                  <TableCell>₹{p.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "PAID" ? "default" : "secondary"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>{p.paymentDate ? p.paymentDate.toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell>{p.paymentMethod ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {yearSchedule.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell>Due in {selectedYear}</TableCell>
                  <TableCell colSpan={4}>₹{yearDue.toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {flat.additionalCharges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Charges & Other Dues</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flat.additionalCharges.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.description}</TableCell>
                    <TableCell>₹{c.amount.toString()}</TableCell>
                    <TableCell>{c.dueDate ? c.dueDate.toLocaleDateString("en-IN") : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "PAID" ? "default" : "secondary"}>
                        {c.status === "PAID" ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {overview && (
        <Card>
          <CardHeader>
            <CardTitle>Building Finances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="text-lg font-semibold">₹{overview.totalIncome.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-semibold">₹{overview.totalOutgoing.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Opening Balance</p>
                <p className="text-lg font-semibold">₹{overview.openingBalance.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Closing Balance</p>
                <p className="text-lg font-semibold">₹{overview.closingBalance.toLocaleString()}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Building-wide totals only — individual residents&apos; payments are not shown here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
