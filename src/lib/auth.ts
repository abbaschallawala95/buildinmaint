import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Profile, Role } from "@/generated/prisma/client";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.profile.findUnique({ where: { authUserId: user.id } });
}

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
