import { requireRoleOrRedirect } from "@/lib/auth";
import { getAdminNavContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { NavShell } from "@/components/nav-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRoleOrRedirect(["SUPER_ADMIN", "BUILDING_ADMIN"]);
  const { profile, buildingId } = await getAdminNavContext();

  const building = buildingId ? await prisma.building.findUnique({ where: { id: buildingId } }) : null;
  const buildings =
    profile.role === "SUPER_ADMIN"
      ? await prisma.building.findMany({ orderBy: { name: "asc" } })
      : [];

  return (
    <NavShell
      role="admin"
      title={building?.name ?? "Admin"}
      userName={profile.name}
      isSuperAdmin={profile.role === "SUPER_ADMIN"}
      buildings={buildings.map((b) => ({ id: b.id, name: b.name }))}
      selectedBuildingId={buildingId ?? undefined}
    >
      {children}
    </NavShell>
  );
}
