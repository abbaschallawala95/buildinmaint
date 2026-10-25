import { requireRoleOrRedirect } from "@/lib/auth";
import { getAdminNavContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { DEFAULT_THEME } from "@/lib/themes";
import { NavShell } from "@/components/nav-shell";
import { ForcePasswordChangeDialog } from "@/components/force-password-change-dialog";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRoleOrRedirect(["SUPER_ADMIN", "BUILDING_ADMIN"]);
  const { profile, buildingId } = await getAdminNavContext();
  if (profile.mustChangePassword) return <ForcePasswordChangeDialog />;

  // Independent lookups: run them together rather than one round trip after another.
  const [building, settings, buildings] = await Promise.all([
    buildingId ? prisma.building.findUnique({ where: { id: buildingId } }) : null,
    buildingId ? getSettings(buildingId) : null,
    profile.role === "SUPER_ADMIN" ? prisma.building.findMany({ orderBy: { name: "asc" } }) : [],
  ]);
  // The selected building's theme (super admin: whichever building the switcher is on).
  const skin = settings?.theme ?? DEFAULT_THEME;

  return (
    <NavShell
      role="admin"
      title={building?.name ?? "Admin"}
      userName={profile.name}
      isSuperAdmin={profile.role === "SUPER_ADMIN"}
      buildings={buildings.map((b) => ({ id: b.id, name: b.name }))}
      selectedBuildingId={buildingId ?? undefined}
      skin={skin}
    >
      {children}
    </NavShell>
  );
}
