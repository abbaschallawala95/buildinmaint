import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import type { Profile } from "@/generated/prisma/client";

export const SELECTED_BUILDING_COOKIE = "selectedBuildingId";

// The building the super admin's switcher is on (cookie), else the first building; null if
// there are none. Cached so the layout and the page share one lookup per request.
const superAdminBuildingId = cache(async (): Promise<string | null> => {
  const store = await cookies();
  const selected = store.get(SELECTED_BUILDING_COOKIE)?.value;
  if (selected && (await prisma.building.findUnique({ where: { id: selected }, select: { id: true } }))) return selected;
  const first = await prisma.building.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  return first?.id ?? null;
});

// Use at the top of any /admin server component/page or server action. Works for both
// roles that reach /admin: BUILDING_ADMIN is pinned to their own building; SUPER_ADMIN
// operates on whichever building they've picked via the switcher (cookie-backed),
// falling back to the first building if none is selected yet.
export async function requireAdminContext(): Promise<{ profile: Profile; buildingId: string }> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.isActive) redirect("/login");
  if (profile.role === "MEMBER") redirect("/member");

  if (profile.role === "BUILDING_ADMIN") {
    if (!profile.buildingId) redirect("/login");
    return { profile, buildingId: profile.buildingId };
  }

  // SUPER_ADMIN
  const buildingId = await superAdminBuildingId();
  if (!buildingId) redirect("/admin/buildings");
  return { profile, buildingId };
}

// Use at the top of a server component/action that only SUPER_ADMIN may access
// (building management itself — creating buildings/building admins).
export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.isActive || profile.role !== "SUPER_ADMIN") redirect("/login");
  return profile;
}

// Lenient variant for the /admin layout itself (which wraps /admin/buildings too — the
// page a fresh SUPER_ADMIN with zero buildings needs to reach). Never redirects on a
// missing building; buildingId is null in that case instead. Individual pages that need
// a concrete building still use requireAdminContext(), which does redirect.
export async function getAdminNavContext(): Promise<{ profile: Profile; buildingId: string | null }> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.isActive) redirect("/login");
  if (profile.role === "MEMBER") redirect("/member");

  if (profile.role === "BUILDING_ADMIN") {
    return { profile, buildingId: profile.buildingId };
  }

  return { profile, buildingId: await superAdminBuildingId() };
}
