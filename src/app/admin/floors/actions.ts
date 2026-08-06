"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const floorSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.coerce.number().int().default(0),
});

export async function createFloor(formData: FormData) {
  const { profile: actor, buildingId } = await requireAdminContext();
  const parsed = floorSchema.parse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  const floor = await prisma.floor.create({ data: { ...parsed, buildingId } });
  await logAudit(actor.id, "CREATE", "Floor", floor.id, { name: floor.name }, buildingId);
  revalidatePath("/admin/floors");
}

export async function updateFloor(formData: FormData) {
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
}

export async function deleteFloor(id: string) {
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
}

const flatSchema = z.object({
  floorId: z.string().uuid(),
  flatNumber: z.string().min(1),
  monthlyMaintenanceAmount: z.coerce.number().nonnegative(),
  memberId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

export async function createFlat(formData: FormData) {
  const { profile: actor, buildingId } = await requireAdminContext();
  const parsed = flatSchema.parse({
    floorId: formData.get("floorId"),
    flatNumber: formData.get("flatNumber"),
    monthlyMaintenanceAmount: formData.get("monthlyMaintenanceAmount"),
    memberId: formData.get("memberId") ?? "",
  });
  const floor = await prisma.floor.findFirst({ where: { id: parsed.floorId, buildingId } });
  if (!floor) throw new Error("Floor not found");

  const now = new Date();
  const flat = await prisma.flat.create({
    data: {
      ...parsed,
      maintenanceRates: {
        create: {
          amount: parsed.monthlyMaintenanceAmount,
          effectiveMonth: now.getMonth() + 1,
          effectiveYear: now.getFullYear(),
        },
      },
    },
  });
  await logAudit(actor.id, "CREATE", "Flat", flat.id, { flatNumber: flat.flatNumber }, buildingId);
  revalidatePath("/admin/floors");
}

export async function updateFlat(formData: FormData) {
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

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  await prisma.$transaction([
    prisma.flat.update({ where: { id }, data: parsed }),
    prisma.flatMaintenanceRate.upsert({
      where: { flatId_effectiveMonth_effectiveYear: { flatId: id, effectiveMonth: month, effectiveYear: year } },
      create: { flatId: id, amount: parsed.monthlyMaintenanceAmount, effectiveMonth: month, effectiveYear: year },
      update: { amount: parsed.monthlyMaintenanceAmount },
    }),
  ]);
  await logAudit(actor.id, "UPDATE", "Flat", id, { flatNumber: parsed.flatNumber }, buildingId);
  revalidatePath("/admin/floors");
}

export async function deleteFlat(id: string) {
  const { profile: actor, buildingId } = await requireAdminContext();
  const flat = await prisma.flat.findFirst({ where: { id, floor: { buildingId } } });
  if (!flat) throw new Error("Flat not found");
  await prisma.flat.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "Flat", id, undefined, buildingId);
  revalidatePath("/admin/floors");
}
