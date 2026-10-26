"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { withErrors } from "@/lib/action-result";
import { parsePeriod, parseSections } from "@/lib/analytics";
import { FIRST_YEAR } from "@/lib/analytics-data";

// Shares (or re-shares, replacing the sections) one month of analytics with the building's members.
export const shareAnalytics = withErrors(async (formData: FormData) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const period = parsePeriod(String(formData.get("period") ?? ""), FIRST_YEAR);
  if (!period) throw new Error("Pick a valid month to share.");
  const compare = parsePeriod(String(formData.get("cmp") ?? ""), FIRST_YEAR);
  // Without a compare month the comparison section would be empty, so it isn't shared.
  const sections = parseSections(formData.getAll("s").map(String)).filter((k) => compare || k !== "compare");
  if (sections.length === 0) throw new Error("Tick at least one section to share.");

  const data = {
    sections,
    compareYear: compare?.year ?? null,
    compareMonth: compare?.month ?? null,
    sharedByName: actor.name,
    sharedAt: new Date(),
  };
  const shared = await prisma.sharedAnalytics.upsert({
    where: { buildingId_year_month: { buildingId, ...period } },
    create: { buildingId, ...period, ...data },
    update: data,
  });
  await logAudit(actor.id, "SHARE_ANALYTICS", "SharedAnalytics", shared.id, {
    ...period,
    sections: sections.join(", "),
    compare: compare ? `${compare.month}/${compare.year}` : null,
  }, buildingId);

  revalidatePath("/admin/analytics");
  revalidatePath("/member", "layout");
});

export const unshareAnalytics = withErrors(async (formData: FormData) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const id = z.string().uuid().parse(formData.get("id"));
  // Scoped delete: a guessed id from another building matches nothing.
  const shared = await prisma.sharedAnalytics.findFirst({ where: { id, buildingId } });
  if (!shared) throw new Error("That shared report no longer exists.");
  await prisma.sharedAnalytics.delete({ where: { id } });
  await logAudit(actor.id, "UNSHARE_ANALYTICS", "SharedAnalytics", id, { year: shared.year, month: shared.month }, buildingId);

  revalidatePath("/admin/analytics");
  revalidatePath("/member", "layout");
});
