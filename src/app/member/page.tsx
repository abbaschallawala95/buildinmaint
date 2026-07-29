import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFinancialOverview } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function MemberDashboardPage() {
  const profile = await getCurrentProfile();

  const flat = await prisma.flat.findUnique({
    where: { memberId: profile!.id },
    include: {
      floor: true,
      payments: { orderBy: [{ year: "desc" }, { month: "desc" }] },
      additionalCharges: { orderBy: { createdAt: "desc" } },
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
  const pendingAmount = (isCurrentPaid ? 0 : Number(flat.monthlyMaintenanceAmount)) + pendingCharges;

  const settings = await prisma.settings.findFirst();
  const overview = settings?.allowMembersViewFinancials ? await getFinancialOverview() : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {flat.floor.name} / {flat.flatNumber}
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
              Total Pending
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

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
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
              {flat.payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {flat.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </TableCell>
                  <TableCell>₹{p.amount.toString()}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "PAID" ? "default" : "secondary"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>{p.paymentDate ? p.paymentDate.toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{p.paymentMethod ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
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
                    <TableCell>{c.dueDate ? c.dueDate.toLocaleDateString() : "—"}</TableCell>
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
