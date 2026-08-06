"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
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
  const actor = await requireRole("SUPER_ADMIN");

  const parsed = schema.parse({
    buildingName: formData.get("buildingName"),
    openingBalance: formData.get("openingBalance"),
    allowMembersViewFinancials: formData.get("allowMembersViewFinancials") === "on",
    allowMembersViewAllMonths: formData.get("allowMembersViewAllMonths") === "on",
  });

  const settings = await getSettings();
  await prisma.settings.update({ where: { id: settings.id }, data: parsed });
  await logAudit(actor.id, "UPDATE", "Settings", settings.id, parsed);

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/member");
}

export async function resetAllData(_prev: { error?: string }, formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");

  if (formData.get("confirm") !== "DELETE") {
    return { error: 'Type "DELETE" to confirm.' };
  }

  const members = await prisma.profile.findMany({
    where: { role: "MEMBER" },
    select: { authUserId: true },
  });

  await prisma.$transaction([
    prisma.cleaner.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.expenseCategory.deleteMany(),
    prisma.electricityBill.deleteMany(),
    prisma.floor.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.profile.deleteMany({ where: { role: "MEMBER" } }),
  ]);

  const admin = createAdminClient();
  for (const member of members) {
    await admin.auth.admin.deleteUser(member.authUserId).catch(() => {
      // Auth user may already be gone.
    });
  }

  await logAudit(actor.id, "RESET_ALL_DATA", "Building", "all");

  revalidatePath("/admin", "layout");
  revalidatePath("/member", "layout");
  return { error: undefined };
}
