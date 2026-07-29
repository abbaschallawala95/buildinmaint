"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  buildingName: z.string().min(1),
  openingBalance: z.coerce.number(),
  allowMembersViewFinancials: z.coerce.boolean(),
});

export async function updateSettings(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");

  const parsed = schema.parse({
    buildingName: formData.get("buildingName"),
    openingBalance: formData.get("openingBalance"),
    allowMembersViewFinancials: formData.get("allowMembersViewFinancials") === "on",
  });

  const settings = await getSettings();
  await prisma.settings.update({ where: { id: settings.id }, data: parsed });
  await logAudit(actor.id, "UPDATE", "Settings", settings.id, parsed);

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/member");
}
