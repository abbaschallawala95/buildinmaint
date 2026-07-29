"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
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
  const admin = await requireRole("SUPER_ADMIN");
  const parsed = billSchema.parse({
    type: formData.get("type"),
    billingPeriodStart: formData.get("billingPeriodStart"),
    billingPeriodEnd: formData.get("billingPeriodEnd"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
  });

  const bill = await prisma.electricityBill.create({
    data: {
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
  });

  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
}

export async function updateBill(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = billSchema.parse({
    type: formData.get("type"),
    billingPeriodStart: formData.get("billingPeriodStart"),
    billingPeriodEnd: formData.get("billingPeriodEnd"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
  });

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
  });

  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
}

export async function deleteBill(id: string) {
  const actor = await requireRole("SUPER_ADMIN");
  await prisma.electricityBill.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "ElectricityBill", id);
  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
}

const markPaidSchema = z.object({
  id: z.string().uuid(),
  paymentDate: z.string().min(1),
});

export async function markBillPaid(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");
  const parsed = markPaidSchema.parse({
    id: formData.get("id"),
    paymentDate: formData.get("paymentDate"),
  });

  await prisma.electricityBill.update({
    where: { id: parsed.id },
    data: { status: "PAID", paymentDate: new Date(parsed.paymentDate) },
  });
  await logAudit(actor.id, "MARK_PAID", "ElectricityBill", parsed.id);

  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
}

export async function markBillUnpaid(id: string) {
  const actor = await requireRole("SUPER_ADMIN");
  await prisma.electricityBill.update({
    where: { id },
    data: { status: "UNPAID", paymentDate: null },
  });
  await logAudit(actor.id, "MARK_UNPAID", "ElectricityBill", id);
  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
}
