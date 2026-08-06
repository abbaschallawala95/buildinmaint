import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/building-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddMemberDialog } from "./add-member-dialog";
import { EditMemberDialog } from "./edit-member-dialog";
import { MemberRowActions } from "./member-row-actions";

export default async function UsersPage() {
  const { buildingId } = await requireAdminContext();

  const [members, flats] = await Promise.all([
    prisma.profile.findMany({
      where: { role: "MEMBER", buildingId },
      include: { flat: { include: { floor: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.flat.findMany({
      where: { floor: { buildingId } },
      include: { floor: true },
      orderBy: [{ floor: { sortOrder: "asc" } }, { flatNumber: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Members</h1>
        <AddMemberDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Flat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No members yet.
                  </TableCell>
                </TableRow>
              )}
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{m.phone ?? "—"}</TableCell>
                  <TableCell>
                    {m.flat ? `${m.flat.floor.name} / ${m.flat.flatNumber}` : "Unassigned"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.isActive ? "default" : "secondary"}>
                      {m.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <EditMemberDialog
                        member={{ id: m.id, name: m.name, email: m.email, phone: m.phone, flatId: m.flat?.id ?? null }}
                        flatOptions={flats
                          .filter((f) => !f.memberId || f.memberId === m.id)
                          .map((f) => ({ id: f.id, label: `${f.floor.name} / ${f.flatNumber}` }))}
                      />
                      <MemberRowActions id={m.id} isActive={m.isActive} />
                    </div>
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
