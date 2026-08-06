import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ExportPage() {
  const now = new Date();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Export Reports</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Monthly Report</CardTitle>
          <CardDescription>
            Income/expense summary, per-flat maintenance status, and transactions for a selected month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/admin/export/monthly-report" method="get" className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Month</label>
              <select
                name="month"
                defaultValue={now.getMonth() + 1}
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
              <Input name="year" type="number" defaultValue={now.getFullYear()} className="w-24" />
            </div>
            <Button type="submit" name="format" value="excel" variant="outline">
              Export Excel
            </Button>
            <Button type="submit" name="format" value="pdf" variant="outline">
              Export PDF
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Total Dues Report</CardTitle>
          <CardDescription>
            Every flat&apos;s total maintenance dues (since Jan 2026) plus unpaid additional charges, as of today.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/admin/export/dues-report" method="get" className="flex flex-wrap items-end gap-2">
            <Button type="submit" name="format" value="excel" variant="outline">
              Export Excel
            </Button>
            <Button type="submit" name="format" value="pdf" variant="outline">
              Export PDF
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
