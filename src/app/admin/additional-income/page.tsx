import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBulkCharge } from "./actions";

export default async function AdditionalIncomePage() {
  const flats = await prisma.flat.findMany({
    orderBy: [{ floor: { sortOrder: "asc" } }, { flatNumber: "asc" }],
    include: { floor: true, member: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Additional Income</h1>
        <p className="text-sm text-muted-foreground">
          Collect a one-off charge from flats for an event or special work — e.g. a festival
          contribution or a repair fund. Creates an unpaid additional charge per flat; mark each
          one paid as members pay from that flat&apos;s Payments page. Leave a flat&apos;s amount
          blank to skip it.
        </p>
      </div>

      <form action={createBulkCharge} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="e.g. Ganesh Utsav contribution"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (optional)</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amount per Flat</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flat</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="w-40">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No flats set up yet.
                    </TableCell>
                  </TableRow>
                )}
                {flats.map((flat) => (
                  <TableRow key={flat.id}>
                    <TableCell>
                      {flat.floor.name} / {flat.flatNumber}
                    </TableCell>
                    <TableCell>{flat.member?.name ?? "Unassigned"}</TableCell>
                    <TableCell>
                      <Input
                        name={`amount-${flat.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Button type="submit" disabled={flats.length === 0}>
          Create Charges
        </Button>
      </form>
    </div>
  );
}
