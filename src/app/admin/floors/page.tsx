import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/building-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { FloorDialog } from "./floor-dialog";
import { FlatDialog } from "./flat-dialog";
import { deleteFloor, deleteFlat } from "./actions";

export default async function FloorsPage() {
  const { buildingId } = await requireAdminContext();

  const [floors, members] = await Promise.all([
    prisma.floor.findMany({
      where: { buildingId },
      orderBy: { sortOrder: "asc" },
      include: { flats: { include: { member: true }, orderBy: { flatNumber: "asc" } } },
    }),
    prisma.profile.findMany({
      where: { role: "MEMBER", buildingId },
      include: { flat: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Floors & Flats</h1>
        <FloorDialog trigger={<Button>Add Floor</Button>} />
      </div>

      {floors.length === 0 && (
        <p className="text-muted-foreground">No floors yet. Add one to get started.</p>
      )}

      {floors.map((floor) => {
        return (
          <Card key={floor.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{floor.name}</CardTitle>
              <div className="flex gap-2">
                <FlatDialog
                  floorId={floor.id}
                  members={members
                    .filter((m) => !m.flat)
                    .map((m) => ({ id: m.id, name: m.name, email: m.email }))}
                  trigger={
                    <Button variant="outline" size="sm">
                      Add Flat
                    </Button>
                  }
                />
                <FloorDialog
                  floor={floor}
                  trigger={
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  }
                />
                <ConfirmDeleteButton
                  label="Delete Floor"
                  confirmMessage={`Delete "${floor.name}"? This is only possible if it has no flats.`}
                  action={deleteFloor}
                  id={floor.id}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flat</TableHead>
                    <TableHead>Monthly Maintenance</TableHead>
                    <TableHead>Assigned Member</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {floor.flats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No flats on this floor.
                      </TableCell>
                    </TableRow>
                  )}
                  {floor.flats.map((flat) => (
                    <TableRow key={flat.id}>
                      <TableCell>{flat.flatNumber}</TableCell>
                      <TableCell>₹{flat.monthlyMaintenanceAmount.toString()}</TableCell>
                      <TableCell>{flat.member ? flat.member.name : "Unassigned"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <FlatDialog
                            floorId={floor.id}
                            flat={{
                              id: flat.id,
                              flatNumber: flat.flatNumber,
                              monthlyMaintenanceAmount: flat.monthlyMaintenanceAmount.toString(),
                              memberId: flat.memberId,
                            }}
                            members={members
                              .filter((m) => !m.flat || m.flat.id === flat.id)
                              .map((m) => ({ id: m.id, name: m.name, email: m.email }))}
                            trigger={
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            }
                          />
                          <ConfirmDeleteButton
                            confirmMessage={`Delete flat ${flat.flatNumber}? This also deletes its payment history.`}
                            action={deleteFlat}
                            id={flat.id}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
