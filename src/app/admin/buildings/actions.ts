"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/building-context";
import { SELECTED_BUILDING_COOKIE } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export async function selectBuilding(formData: FormData) {
  await requireSuperAdmin();
  const buildingId = z.string().uuid().parse(formData.get("buildingId"));
  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) throw new Error("Building not found");

  const store = await cookies();
  store.set(SELECTED_BUILDING_COOKIE, buildingId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/admin");
}

const createBuildingSchema = z.object({ name: z.string().min(1) });

export async function createBuilding(formData: FormData) {
  const actor = await requireSuperAdmin();
  const parsed = createBuildingSchema.parse({ name: formData.get("name") });

  const building = await prisma.building.create({
    data: {
      name: parsed.name,
      settings: { create: { buildingName: parsed.name } },
    },
  });
  await logAudit(actor.id, "CREATE", "Building", building.id, { name: parsed.name });

  revalidatePath("/admin/buildings");
}

const updateBuildingSchema = z.object({ id: z.string().uuid(), name: z.string().min(1) });

export async function updateBuilding(formData: FormData) {
  const actor = await requireSuperAdmin();
  const parsed = updateBuildingSchema.parse({ id: formData.get("id"), name: formData.get("name") });

  await prisma.$transaction([
    prisma.building.update({ where: { id: parsed.id }, data: { name: parsed.name } }),
    prisma.settings.update({ where: { buildingId: parsed.id }, data: { buildingName: parsed.name } }),
  ]);
  await logAudit(actor.id, "UPDATE", "Building", parsed.id, { name: parsed.name });

  revalidatePath("/admin/buildings");
  revalidatePath("/admin");
}

const deleteBuildingSchema = z.object({ id: z.string().uuid(), confirmName: z.string() });

export async function deleteBuilding(_prev: { error?: string }, formData: FormData) {
  const actor = await requireSuperAdmin();
  const parsed = deleteBuildingSchema.parse({
    id: formData.get("id"),
    confirmName: formData.get("confirmName"),
  });

  const building = await prisma.building.findUnique({ where: { id: parsed.id } });
  if (!building) return { error: "Building not found" };
  if (parsed.confirmName !== building.name) {
    return { error: `Type "${building.name}" to confirm.` };
  }

  const profiles = await prisma.profile.findMany({
    where: { buildingId: parsed.id },
    select: { authUserId: true },
  });

  // Profiles must go first (Profile.building is a restrict-on-delete FK); everything else
  // (floors, cleaners, expenses, settings, audit logs) cascades from the Building delete.
  await prisma.$transaction([
    prisma.profile.deleteMany({ where: { buildingId: parsed.id } }),
    prisma.building.delete({ where: { id: parsed.id } }),
  ]);

  const admin = createAdminClient();
  for (const profile of profiles) {
    await admin.auth.admin.deleteUser(profile.authUserId).catch(() => {
      // Auth user may already be gone.
    });
  }

  await logAudit(actor.id, "DELETE", "Building", parsed.id, { name: building.name });

  revalidatePath("/admin/buildings");
  return { error: undefined };
}

const createAdminSchema = z.object({
  buildingId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
});

export async function createBuildingAdmin(_prev: { error?: string }, formData: FormData) {
  const actor = await requireSuperAdmin();

  const parsed = createAdminSchema.safeParse({
    buildingId: formData.get("buildingId"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existingAdmin = await prisma.profile.findFirst({
    where: { buildingId: parsed.data.buildingId, role: "BUILDING_ADMIN" },
  });
  if (existingAdmin) return { error: "This building already has an admin." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (error || !data.user) return { error: error?.message ?? "Could not create account" };

  const profile = await prisma.profile.create({
    data: {
      authUserId: data.user.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      role: "BUILDING_ADMIN",
      buildingId: parsed.data.buildingId,
      mustChangePassword: true,
    },
  });
  await logAudit(actor.id, "CREATE", "Profile", profile.id, {
    name: profile.name,
    email: profile.email,
    role: "BUILDING_ADMIN",
  });

  revalidatePath("/admin/buildings");
  return { error: undefined };
}

const updateAdminSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
});

export async function updateBuildingAdmin(_prev: { error?: string }, formData: FormData) {
  const actor = await requireSuperAdmin();
  const parsed = updateAdminSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const profile = await prisma.profile.findFirst({
    where: { id: parsed.data.id, role: "BUILDING_ADMIN" },
  });
  if (!profile) return { error: "Admin not found" };

  if (parsed.data.email !== profile.email) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(profile.authUserId, {
      email: parsed.data.email,
      email_confirm: true,
    });
    if (error) return { error: error.message };
  }

  await prisma.profile.update({
    where: { id: parsed.data.id },
    data: { name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone },
  });
  await logAudit(actor.id, "UPDATE", "Profile", parsed.data.id, {
    name: parsed.data.name,
    email: parsed.data.email,
  });

  revalidatePath("/admin/buildings");
  return { error: undefined };
}

const resetAdminPasswordSchema = z.object({ id: z.string().uuid(), password: z.string().min(6) });

export async function resetBuildingAdminPassword(_prev: { error?: string }, formData: FormData) {
  const actor = await requireSuperAdmin();
  const parsed = resetAdminPasswordSchema.safeParse({
    id: formData.get("id"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const profile = await prisma.profile.findFirst({
    where: { id: parsed.data.id, role: "BUILDING_ADMIN" },
  });
  if (!profile) return { error: "Admin not found" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(profile.authUserId, {
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  await prisma.profile.update({ where: { id: profile.id }, data: { mustChangePassword: true } });
  await logAudit(actor.id, "RESET_PASSWORD", "Profile", profile.id);
  return { error: undefined };
}

export async function removeBuildingAdmin(id: string) {
  const actor = await requireSuperAdmin();

  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile || profile.role !== "BUILDING_ADMIN") return;

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(profile.authUserId).catch(() => {
    // Auth user may already be gone; still remove the profile below.
  });

  await prisma.profile.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "Profile", id, { name: profile.name, email: profile.email });
  revalidatePath("/admin/buildings");
}
