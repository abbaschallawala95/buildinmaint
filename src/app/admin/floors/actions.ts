"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { parseEffectiveFrom, rateForMonth } from "@/lib/rate-history";
import { withErrors } from "@/lib/action-result";

const floorSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.coerce.number().int().default(0),
});

export const createFloor = withErrors(async (formData: FormData) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const parsed = floorSchema.parse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  const floor = await prisma.floor.create({ data: { ...parsed, buildingId } });
  await logAudit(actor.id, "CREATE", "Floor", floor.id, { name: floor.name }, buildingId);
  revalidatePath("/admin/floors");
});

export const updateFloor = withErrors(async (formData: FormData) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = floorSchema.parse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  const floor = await prisma.floor.findFirst({ where: { id, buildingId } });
  if (!floor) throw new Error("Floor not found");
  await prisma.floor.update({ where: { id }, data: parsed });
  await logAudit(actor.id, "UPDATE", "Floor", id, { name: parsed.name }, buildingId);
  revalidatePath("/admin/floors");
});

export const deleteFloor = withErrors(async (id: string) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const floor = await prisma.floor.findFirst({ where: { id, buildingId } });
  if (!floor) throw new Error("Floor not found");
  const flatCount = await prisma.flat.count({ where: { floorId: id } });
  if (flatCount > 0) {
    throw new Error("Remove all flats on this floor first.");
  }
  await prisma.floor.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "Floor", id, undefined, buildingId);
  revalidatePath("/admin/floors");
});

const flatSchema = z.object({
  floorId: z.string().uuid(),
  flatNumber: z.string().min(1),
  monthlyMaintenanceAmount: z.coerce.number().nonnegative(),
  memberId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

export const createFlat = withErrors(async (formData: FormData) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const parsed = flatSchema.parse({
    floorId: formData.get("floorId"),
    flatNumber: formData.get("flatNumber"),
    monthlyMaintenanceAmount: formData.get("monthlyMaintenanceAmount"),
    memberId: formData.get("memberId") ?? "",
  });
  const floor = await prisma.floor.findFirst({ where: { id: parsed.floorId, buildingId } });
  if (!floor) throw new Error("Floor not found");

  const from = parseEffectiveFrom(formData.get("effectiveFrom"));
  const flat = await prisma.flat.create({
    data: {
      ...parsed,
      maintenanceRates: {
        create: {
          amount: parsed.monthlyMaintenanceAmount,
          effectiveMonth: from.month,
          effectiveYear: from.year,
        },
      },
    },
  });
  await logAudit(actor.id, "CREATE", "Flat", flat.id, { flatNumber: flat.flatNumber }, buildingId);
  revalidatePath("/admin/floors");
});

export const updateFlat = withErrors(async (formData: FormData) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = flatSchema.parse({
    floorId: formData.get("floorId"),
    flatNumber: formData.get("flatNumber"),
    monthlyMaintenanceAmount: formData.get("monthlyMaintenanceAmount"),
    memberId: formData.get("memberId") ?? "",
  });
  const flat = await prisma.flat.findFirst({ where: { id, floor: { buildingId } } });
  if (!flat) throw new Error("Flat not found");
  const floor = await prisma.floor.findFirst({ where: { id: parsed.floorId, buildingId } });
  if (!floor) throw new Error("Floor not found");

  const { month, year } = parseEffectiveFrom(formData.get("effectiveFrom"));

  await prisma.$transaction(async (tx) => {
    await tx.flatMaintenanceRate.upsert({
      where: { flatId_effectiveMonth_effectiveYear: { flatId: id, effectiveMonth: month, effectiveYear: year } },
      create: { flatId: id, amount: parsed.monthlyMaintenanceAmount, effectiveMonth: month, effectiveYear: year },
      update: { amount: parsed.monthlyMaintenanceAmount },
    });
    // A back-dated change may be superseded by a later one, so store the rate in effect today.
    const rates = await tx.flatMaintenanceRate.findMany({ where: { flatId: id } });
    const now = new Date();
    const current = rateForMonth(
      rates.map((r) => ({ amount: Number(r.amount), effectiveMonth: r.effectiveMonth, effectiveYear: r.effectiveYear })),
      now.getMonth() + 1,
      now.getFullYear(),
    );
    await tx.flat.update({ where: { id }, data: { ...parsed, monthlyMaintenanceAmount: current } });
  });
  await logAudit(actor.id, "UPDATE", "Flat", id, {
    flatNumber: parsed.flatNumber,
    amount: parsed.monthlyMaintenanceAmount,
    effectiveFrom: `${year}-${String(month).padStart(2, "0")}`,
  }, buildingId);
  revalidatePath("/admin/floors");
});

export const deleteFlat = withErrors(async (id: string) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const flat = await prisma.flat.findFirst({ where: { id, floor: { buildingId } } });
  if (!flat) throw new Error("Flat not found");
  await prisma.flat.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "Flat", id, undefined, buildingId);
  revalidatePath("/admin/floors");
});
