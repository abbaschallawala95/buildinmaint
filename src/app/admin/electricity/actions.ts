"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const billSchema = z.object({
  type: z.enum(["LIFT", "COMMON_AREA"]),
  billingPeriodStart: z.string().min(1),
  billingPeriodEnd: z.string().min(1),
  amount: z.coerce.number().positive(),
  dueDate: z.string().min(1),
});

export async function createBill(formData: FormData) {
  const { profile: admin, buildingId } = await requireAdminContext();
  const parsed = billSchema.parse({
    type: formData.get("type"),
    billingPeriodStart: formData.get("billingPeriodStart"),
    billingPeriodEnd: formData.get("billingPeriodEnd"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
  });

  const bill = await prisma.electricityBill.create({
    data: {
      buildingId,
      type: parsed.type,
      billingPeriodStart: new Date(parsed.billingPeriodStart),
      billingPeriodEnd: new Date(parsed.billingPeriodEnd),
      amount: parsed.amount,
      dueDate: new Date(parsed.dueDate),
      recordedById: admin.id,
    },
  });
  await logAudit(admin.id, "CREATE", "ElectricityBill", bill.id, {
    type: parsed.type,
    amount: parsed.amount,
  }, buildingId);

  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
}

export async function updateBill(formData: FormData) {
  const { profile: actor, buildingId } = await requireAdminContext();
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = billSchema.parse({
    type: formData.get("type"),
    billingPeriodStart: formData.get("billingPeriodStart"),
    billingPeriodEnd: formData.get("billingPeriodEnd"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
  });
  const bill = await prisma.electricityBill.findFirst({ where: { id, buildingId } });
  if (!bill) throw new Error("Bill not found");

  await prisma.electricityBill.update({
    where: { id },
    data: {
      type: parsed.type,
      billingPeriodStart: new Date(parsed.billingPeriodStart),
      billingPeriodEnd: new Date(parsed.billingPeriodEnd),
      amount: parsed.amount,
      dueDate: new Date(parsed.dueDate),
    },
  });
  await logAudit(actor.id, "UPDATE", "ElectricityBill", id, {
    type: parsed.type,
    amount: parsed.amount,
  }, buildingId);

  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
}

export async function deleteBill(id: string) {
  const { profile: actor, buildingId } = await requireAdminContext();
  const bill = await prisma.electricityBill.findFirst({ where: { id, buildingId } });
  if (!bill) throw new Error("Bill not found");
  await prisma.electricityBill.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "ElectricityBill", id, undefined, buildingId);
  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
}

const markPaidSchema = z.object({
  id: z.string().uuid(),
  paymentDate: z.string().min(1),
});

export async function markBillPaid(formData: FormData) {
  const { profile: actor, buildingId } = await requireAdminContext();
  const parsed = markPaidSchema.parse({
    id: formData.get("id"),
    paymentDate: formData.get("paymentDate"),
  });
  const bill = await prisma.electricityBill.findFirst({ where: { id: parsed.id, buildingId } });
  if (!bill) throw new Error("Bill not found");

  await prisma.electricityBill.update({
    where: { id: parsed.id },
    data: { status: "PAID", paymentDate: new Date(parsed.paymentDate) },
  });
  await logAudit(actor.id, "MARK_PAID", "ElectricityBill", parsed.id, undefined, buildingId);

  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
}

export async function markBillUnpaid(id: string) {
  const { profile: actor, buildingId } = await requireAdminContext();
  const bill = await prisma.electricityBill.findFirst({ where: { id, buildingId } });
  if (!bill) throw new Error("Bill not found");
  await prisma.electricityBill.update({
    where: { id },
    data: { status: "UNPAID", paymentDate: null },
  });
  await logAudit(actor.id, "MARK_UNPAID", "ElectricityBill", id, undefined, buildingId);
  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
}
