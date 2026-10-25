"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  buildingName: z.string().min(1),
  openingBalance: z.coerce.number(),
  allowMembersViewFinancials: z.coerce.boolean(),
  allowMembersViewAllMonths: z.coerce.boolean(),
});

export async function updateSettings(formData: FormData) {
  const { profile: actor, buildingId } = await requireAdminContext();

  const parsed = schema.parse({
    buildingName: formData.get("buildingName"),
    openingBalance: formData.get("openingBalance"),
    allowMembersViewFinancials: formData.get("allowMembersViewFinancials") === "on",
    allowMembersViewAllMonths: formData.get("allowMembersViewAllMonths") === "on",
  });

  const settings = await getSettings(buildingId);
  await prisma.$transaction([
    prisma.settings.update({ where: { id: settings.id }, data: parsed }),
    prisma.building.update({ where: { id: buildingId }, data: { name: parsed.buildingName } }),
  ]);
  await logAudit(actor.id, "UPDATE", "Settings", settings.id, parsed, buildingId);

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/member");
}

export async function resetAllData(_prev: { error?: string }, formData: FormData) {
  const { profile: actor, buildingId } = await requireAdminContext();

  if (actor.role !== "SUPER_ADMIN") {
    return { error: "Only a super admin can erase building data." };
  }

  if (formData.get("confirm") !== "DELETE") {
    return { error: 'Type "DELETE" to confirm.' };
  }

  const members = await prisma.profile.findMany({
    where: { role: "MEMBER", buildingId },
    select: { authUserId: true },
  });

  await prisma.$transaction([
    prisma.cleaner.deleteMany({ where: { buildingId } }),
    prisma.expense.deleteMany({ where: { buildingId } }),
    prisma.expenseCategory.deleteMany({ where: { buildingId } }),
    prisma.electricityBill.deleteMany({ where: { buildingId } }),
    prisma.floor.deleteMany({ where: { buildingId } }),
    prisma.profile.deleteMany({ where: { role: "MEMBER", buildingId } }),
  ]);

  const admin = createAdminClient();
  for (const member of members) {
    await admin.auth.admin.deleteUser(member.authUserId).catch(() => {
      // Auth user may already be gone.
    });
  }

  await logAudit(actor.id, "RESET_ALL_DATA", "Building", buildingId, undefined, buildingId);

  revalidatePath("/admin", "layout");
  revalidatePath("/member", "layout");
  return { error: undefined };
}
