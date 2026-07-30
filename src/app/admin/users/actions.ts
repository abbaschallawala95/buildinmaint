"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
});

export async function createMember(_prev: { error?: string }, formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

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
      role: "MEMBER",
    },
  });
  await logAudit(actor.id, "CREATE", "Profile", profile.id, { name: profile.name, email: profile.email });

  revalidatePath("/admin/users");
  return { error: undefined };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
});

export async function updateMember(_prev: { error?: string }, formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const profile = await prisma.profile.findUnique({ where: { id: parsed.data.id } });
  if (!profile) return { error: "Member not found" };

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
  await logAudit(actor.id, "UPDATE", "Profile", parsed.data.id, { name: parsed.data.name, email: parsed.data.email });

  revalidatePath("/admin/users");
  return { error: undefined };
}

export async function setMemberActive(id: string, isActive: boolean) {
  const actor = await requireRole("SUPER_ADMIN");
  await prisma.profile.update({ where: { id }, data: { isActive } });
  await logAudit(actor.id, isActive ? "ACTIVATE" : "DEACTIVATE", "Profile", id);
  revalidatePath("/admin/users");
}

export async function deleteMember(id: string) {
  const actor = await requireRole("SUPER_ADMIN");

  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile) return;

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(profile.authUserId).catch(() => {
    // Auth user may already be gone; still remove the profile below.
  });

  await prisma.profile.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "Profile", id, { name: profile.name, email: profile.email });
  revalidatePath("/admin/users");
  revalidatePath("/admin/floors");
}

const resetPasswordSchema = z.object({
  id: z.string().uuid(),
  password: z.string().min(6),
});

export async function resetMemberPassword(_prev: { error?: string }, formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");

  const parsed = resetPasswordSchema.safeParse({
    id: formData.get("id"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const profile = await prisma.profile.findUnique({ where: { id: parsed.data.id } });
  if (!profile) return { error: "Member not found" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(profile.authUserId, {
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  await logAudit(actor.id, "RESET_PASSWORD", "Profile", profile.id);
  return { error: undefined };
}
