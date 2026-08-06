"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/building-context";
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
  const { profile: actor, buildingId } = await requireAdminContext();

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
      buildingId,
    },
  });
  await logAudit(actor.id, "CREATE", "Profile", profile.id, { name: profile.name, email: profile.email }, buildingId);

  revalidatePath("/admin/users");
  return { error: undefined };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  flatId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

export async function updateMember(_prev: { error?: string }, formData: FormData) {
  const { profile: actor, buildingId } = await requireAdminContext();

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    flatId: formData.get("flatId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const profile = await prisma.profile.findFirst({
    where: { id: parsed.data.id, buildingId },
    include: { flat: true },
  });
  if (!profile) return { error: "Member not found" };

  if (parsed.data.flatId) {
    const flat = await prisma.flat.findFirst({ where: { id: parsed.data.flatId, floor: { buildingId } } });
    if (!flat) return { error: "Flat not found" };
  }

  if (parsed.data.email !== profile.email) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(profile.authUserId, {
      email: parsed.data.email,
      email_confirm: true,
    });
    if (error) return { error: error.message };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: parsed.data.id },
        data: { name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone },
      });

      if (parsed.data.flatId !== profile.flat?.id) {
        if (profile.flat) {
          await tx.flat.update({ where: { id: profile.flat.id }, data: { memberId: null } });
        }
        if (parsed.data.flatId) {
          await tx.flat.update({ where: { id: parsed.data.flatId }, data: { memberId: parsed.data.id } });
        }
      }
    });
  } catch {
    return { error: "That flat is already assigned to another member." };
  }

  await logAudit(actor.id, "UPDATE", "Profile", parsed.data.id, { name: parsed.data.name, email: parsed.data.email }, buildingId);

  revalidatePath("/admin/users");
  revalidatePath("/admin/floors");
  return { error: undefined };
}

export async function setMemberActive(id: string, isActive: boolean) {
  const { profile: actor, buildingId } = await requireAdminContext();
  const member = await prisma.profile.findFirst({ where: { id, buildingId } });
  if (!member) throw new Error("Member not found");
  await prisma.profile.update({ where: { id }, data: { isActive } });
  await logAudit(actor.id, isActive ? "ACTIVATE" : "DEACTIVATE", "Profile", id, undefined, buildingId);
  revalidatePath("/admin/users");
}

export async function deleteMember(id: string) {
  const { profile: actor, buildingId } = await requireAdminContext();

  const profile = await prisma.profile.findFirst({ where: { id, buildingId } });
  if (!profile) return;

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(profile.authUserId).catch(() => {
    // Auth user may already be gone; still remove the profile below.
  });

  await prisma.profile.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "Profile", id, { name: profile.name, email: profile.email }, buildingId);
  revalidatePath("/admin/users");
  revalidatePath("/admin/floors");
}

const resetPasswordSchema = z.object({
  id: z.string().uuid(),
  password: z.string().min(6),
});

export async function resetMemberPassword(_prev: { error?: string }, formData: FormData) {
  const { profile: actor, buildingId } = await requireAdminContext();

  const parsed = resetPasswordSchema.safeParse({
    id: formData.get("id"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const profile = await prisma.profile.findFirst({ where: { id: parsed.data.id, buildingId } });
  if (!profile) return { error: "Member not found" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(profile.authUserId, {
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  await logAudit(actor.id, "RESET_PASSWORD", "Profile", profile.id, undefined, buildingId);
  return { error: undefined };
}
