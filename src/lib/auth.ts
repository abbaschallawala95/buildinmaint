import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Profile, Role } from "@/generated/prisma/client";

// cache(): the layout and the page both ask for the profile on every navigation; this makes
// it one lookup per request. getClaims() verifies the JWT locally (signing keys) instead of a
// round trip to Supabase Auth; the proxy has already refreshed the session by this point.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;

  return prisma.profile.findUnique({ where: { authUserId: userId } });
});

// Use at the top of a server action or route handler to enforce role access.
export async function requireRole(role: Role): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.isActive || profile.role !== role) {
    throw new Error("Forbidden");
  }
  return profile;
}

// Use at the top of a server component page/layout to enforce role access with a redirect.
export async function requireRoleOrRedirect(role: Role | Role[]): Promise<Profile> {
  const allowed = Array.isArray(role) ? role : [role];
  const profile = await getCurrentProfile();
  if (!profile || !profile.isActive) redirect("/login");
  if (!allowed.includes(profile.role)) {
    redirect(profile.role === "MEMBER" ? "/member" : "/admin");
  }
  return profile;
}
