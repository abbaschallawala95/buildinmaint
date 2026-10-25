"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { withErrors } from "@/lib/action-result";
import { isThemeKey, themeOf } from "@/lib/themes";

export const setBuildingTheme = withErrors(async (formData: FormData) => {
  const actor = await requireSuperAdmin();
  const buildingId = z.string().uuid().parse(formData.get("buildingId"));
  const theme = String(formData.get("theme") ?? "");
  if (!isThemeKey(theme)) throw new Error("That theme doesn't exist.");

  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) throw new Error("Building not found");

  const settings = await getSettings(buildingId); // creates the row for older buildings
  if (settings.theme === theme) return;
  await prisma.settings.update({ where: { buildingId }, data: { theme } });
  await logAudit(actor.id, "UPDATE_THEME", "Settings", settings.id, {
    from: themeOf(settings.theme).name,
    to: themeOf(theme).name,
  }, buildingId);

  // Everyone in the building picks it up on their next page load.
  revalidatePath("/admin", "layout");
  revalidatePath("/member", "layout");
  revalidatePath("/admin/themes");
});
