"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const markPaidSchema = z.object({
  flatId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
  amount: z.coerce.number().nonnegative(),
  paymentDate: z.string().min(1),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]),
  notes: z.string().optional(),
});

export async function markPaymentPaid(formData: FormData) {
  const admin = await requireRole("SUPER_ADMIN");

  const parsed = markPaidSchema.parse({
    flatId: formData.get("flatId"),
    month: formData.get("month"),
    year: formData.get("year"),
    amount: formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes") || undefined,
  });

  const payment = await prisma.maintenancePayment.upsert({
    where: { flatId_month_year: { flatId: parsed.flatId, month: parsed.month, year: parsed.year } },
    create: {
      flatId: parsed.flatId,
      month: parsed.month,
      year: parsed.year,
      amount: parsed.amount,
      status: "PAID",
      paymentDate: new Date(parsed.paymentDate),
      paymentMethod: parsed.paymentMethod,
      notes: parsed.notes,
      recordedById: admin.id,
    },
    update: {
      amount: parsed.amount,
      status: "PAID",
      paymentDate: new Date(parsed.paymentDate),
      paymentMethod: parsed.paymentMethod,
      notes: parsed.notes,
      recordedById: admin.id,
    },
  });
  await logAudit(admin.id, "MARK_PAID", "MaintenancePayment", payment.id, {
    month: parsed.month,
    year: parsed.year,
    amount: parsed.amount,
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}

const chargeSchema = z.object({
  flatId: z.string().uuid(),
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  dueDate: z.string().optional(),
});

export async function createCharge(formData: FormData) {
  const admin = await requireRole("SUPER_ADMIN");
  const parsed = chargeSchema.parse({
    flatId: formData.get("flatId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate") || undefined,
  });

  const charge = await prisma.additionalCharge.create({
    data: {
      flatId: parsed.flatId,
      description: parsed.description,
      amount: parsed.amount,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
      recordedById: admin.id,
    },
  });
  await logAudit(admin.id, "CREATE", "AdditionalCharge", charge.id, {
    description: parsed.description,
    amount: parsed.amount,
  });

  revalidatePath(`/admin/payments/${parsed.flatId}`);
  revalidatePath("/admin");
}

const previousDuesSchema = z.object({
  flatId: z.string().uuid(),
  year: z.coerce.number().int().min(2000),
  amount: z.coerce.number().positive(),
});

export async function addPreviousYearDues(formData: FormData) {
  const admin = await requireRole("SUPER_ADMIN");
  const parsed = previousDuesSchema.parse({
    flatId: formData.get("flatId"),
    year: formData.get("year"),
    amount: formData.get("amount"),
  });

  const charge = await prisma.additionalCharge.create({
    data: {
      flatId: parsed.flatId,
      description: `Previous Year Dues (${parsed.year})`,
      amount: parsed.amount,
      recordedById: admin.id,
    },
  });
  await logAudit(admin.id, "ADD_PREVIOUS_YEAR_DUES", "AdditionalCharge", charge.id, {
    year: parsed.year,
    amount: parsed.amount,
  });

  revalidatePath(`/admin/payments/${parsed.flatId}`);
  revalidatePath("/admin");
}

const markChargePaidSchema = z.object({
  id: z.string().uuid(),
  flatId: z.string().uuid(),
  paymentDate: z.string().min(1),
});

export async function markChargePaid(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");
  const parsed = markChargePaidSchema.parse({
    id: formData.get("id"),
    flatId: formData.get("flatId"),
    paymentDate: formData.get("paymentDate"),
  });

  await prisma.additionalCharge.update({
    where: { id: parsed.id },
    data: { status: "PAID", paymentDate: new Date(parsed.paymentDate) },
  });
  await logAudit(actor.id, "MARK_PAID", "AdditionalCharge", parsed.id);

  revalidatePath(`/admin/payments/${parsed.flatId}`);
  revalidatePath("/admin");
}

export async function deleteCharge(id: string) {
  const actor = await requireRole("SUPER_ADMIN");
  const charge = await prisma.additionalCharge.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "AdditionalCharge", id);
  revalidatePath(`/admin/payments/${charge.flatId}`);
  revalidatePath("/admin");
}

const markUnpaidSchema = z.object({
  flatId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

export async function markPaymentUnpaid(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");

  const parsed = markUnpaidSchema.parse({
    flatId: formData.get("flatId"),
    month: formData.get("month"),
    year: formData.get("year"),
  });

  await prisma.maintenancePayment
    .delete({
      where: { flatId_month_year: { flatId: parsed.flatId, month: parsed.month, year: parsed.year } },
    })
    .catch(() => {
      // No row means it was already unpaid (default state) — nothing to do.
    });
  await logAudit(actor.id, "MARK_UNPAID", "MaintenancePayment", parsed.flatId, {
    month: parsed.month,
    year: parsed.year,
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}
