"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const floorSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.coerce.number().int().default(0),
});

export async function createFloor(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");
  const parsed = floorSchema.parse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  const floor = await prisma.floor.create({ data: parsed });
  await logAudit(actor.id, "CREATE", "Floor", floor.id, { name: floor.name });
  revalidatePath("/admin/floors");
}

export async function updateFloor(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = floorSchema.parse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  await prisma.floor.update({ where: { id }, data: parsed });
  await logAudit(actor.id, "UPDATE", "Floor", id, { name: parsed.name });
  revalidatePath("/admin/floors");
}

export async function deleteFloor(id: string) {
  const actor = await requireRole("SUPER_ADMIN");
  const flatCount = await prisma.flat.count({ where: { floorId: id } });
  if (flatCount > 0) {
    throw new Error("Remove all flats on this floor first.");
  }
  await prisma.floor.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "Floor", id);
  revalidatePath("/admin/floors");
}

const flatSchema = z.object({
  floorId: z.string().uuid(),
  flatNumber: z.string().min(1),
  monthlyMaintenanceAmount: z.coerce.number().nonnegative(),
  memberId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

export async function createFlat(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");
  const parsed = flatSchema.parse({
    floorId: formData.get("floorId"),
    flatNumber: formData.get("flatNumber"),
    monthlyMaintenanceAmount: formData.get("monthlyMaintenanceAmount"),
    memberId: formData.get("memberId") ?? "",
  });
  const flat = await prisma.flat.create({ data: parsed });
  await logAudit(actor.id, "CREATE", "Flat", flat.id, { flatNumber: flat.flatNumber });
  revalidatePath("/admin/floors");
}

export async function updateFlat(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = flatSchema.parse({
    floorId: formData.get("floorId"),
    flatNumber: formData.get("flatNumber"),
    monthlyMaintenanceAmount: formData.get("monthlyMaintenanceAmount"),
    memberId: formData.get("memberId") ?? "",
  });
  await prisma.flat.update({ where: { id }, data: parsed });
  await logAudit(actor.id, "UPDATE", "Flat", id, { flatNumber: parsed.flatNumber });
  revalidatePath("/admin/floors");
}

export async function deleteFlat(id: string) {
  const actor = await requireRole("SUPER_ADMIN");
  await prisma.flat.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "Flat", id);
  revalidatePath("/admin/floors");
}
