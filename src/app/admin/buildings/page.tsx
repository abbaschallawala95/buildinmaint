import { requireSuperAdmin } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreateBuildingDialog } from "./create-building-dialog";
import { EditBuildingDialog } from "./edit-building-dialog";
import { DeleteBuildingDialog } from "./delete-building-dialog";
import { AddAdminDialog } from "./add-admin-dialog";
import { AdminRowActions } from "./admin-row-actions";
import { selectBuilding } from "./actions";

export default async function BuildingsPage() {
  await requireSuperAdmin();

  const buildings = await prisma.building.findMany({
    orderBy: { name: "asc" },
    include: {
      profiles: { where: { role: "BUILDING_ADMIN" } },
      _count: { select: { profiles: { where: { role: "MEMBER" } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Buildings</h1>
        <CreateBuildingDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Buildings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No buildings yet.
                  </TableCell>
                </TableRow>
              )}
              {buildings.map((b) => {
                const admin = b.profiles[0];
                return (
                  <TableRow key={b.id}>
                    <TableCell>{b.name}</TableCell>
                    <TableCell>
                      {admin ? (
                        <AdminRowActions
                          admin={{ id: admin.id, name: admin.name, email: admin.email, phone: admin.phone }}
                          buildingName={b.name}
                        />
                      ) : (
                        <AddAdminDialog buildingId={b.id} buildingName={b.name} />
                      )}
                    </TableCell>
                    <TableCell>{b._count.profiles}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <form action={selectBuilding}>
                          <input type="hidden" name="buildingId" value={b.id} />
                          <Button type="submit" variant="outline" size="sm">
                            Manage
                          </Button>
                        </form>
                        <EditBuildingDialog building={{ id: b.id, name: b.name }} />
                        <DeleteBuildingDialog building={{ id: b.id, name: b.name }} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
