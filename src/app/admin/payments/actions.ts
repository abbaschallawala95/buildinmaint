"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { withErrors, type ActionResult } from "@/lib/action-result";
async function requireFlatInBuilding(flatId: string, buildingId: string) {
  const flat = await prisma.flat.findFirst({ where: { id: flatId, floor: { buildingId } } });
  if (!flat) throw new Error("Flat not found");
  return flat;
}

const markPaidSchema = z.object({
  flatId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
  amount: z.coerce.number().positive(),
  paymentDate: z.string().min(1),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]),
  notes: z.string().optional(),
});

// Also returns the saved payment so the dialog can offer its receipt straight away.
export async function markPaymentPaid(formData: FormData): Promise<ActionResult & { paymentId?: string }> {
  let paymentId: string | undefined;
  const result = await withErrors(async () => {
    paymentId = await savePayment(formData);
  })();
  return { ...result, paymentId };
}

async function savePayment(formData: FormData) {
  const { profile: admin, buildingId } = await requireAdminContext();

  const parsed = markPaidSchema.parse({
    flatId: formData.get("flatId"),
    month: formData.get("month"),
    year: formData.get("year"),
    amount: formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes") || undefined,
  });
  await requireFlatInBuilding(parsed.flatId, buildingId);
  // "Add Payment" on a Partial month adds the installment to what was already paid.
  const adding = formData.get("addToExisting") === "1";

  const payment = await prisma.$transaction(async (tx) => {
    const where = { flatId_month_year: { flatId: parsed.flatId, month: parsed.month, year: parsed.year } };
    const existing = await tx.maintenancePayment.findUnique({ where, select: { receiptNumber: true } });
    // A second installment keeps the month's number; the atomic increment means two admins saving
    // at once can't get the same one.
    const receiptNumber =
      existing?.receiptNumber ??
      (
        await tx.settings.upsert({
          where: { buildingId },
          create: { buildingId, lastReceiptNumber: 1 },
          update: { lastReceiptNumber: { increment: 1 } },
        })
      ).lastReceiptNumber;
    return tx.maintenancePayment.upsert({
      where,
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
        receiptNumber,
      },
      update: {
        amount: adding ? { increment: parsed.amount } : parsed.amount,
        status: "PAID",
        paymentDate: new Date(parsed.paymentDate),
        paymentMethod: parsed.paymentMethod,
        notes: parsed.notes,
        recordedById: admin.id,
        receiptNumber,
      },
    });
  });
  await logAudit(admin.id, adding ? "ADD_PAYMENT" : "MARK_PAID", "MaintenancePayment", payment.id, {
    month: parsed.month,
    year: parsed.year,
    amount: parsed.amount,
    totalPaid: payment.amount.toString(),
    method: parsed.paymentMethod,
  }, buildingId);

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${parsed.flatId}`);
  revalidatePath("/admin/maintenance");
  revalidatePath("/admin");
  revalidatePath("/member");
  return payment.id;
}

const chargeSchema = z.object({
  flatId: z.string().uuid(),
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  dueDate: z.string().optional(),
});

export const createCharge = withErrors(async (formData: FormData) => {
  const { profile: admin, buildingId } = await requireAdminContext();
  const parsed = chargeSchema.parse({
    flatId: formData.get("flatId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate") || undefined,
  });
  await requireFlatInBuilding(parsed.flatId, buildingId);

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
  }, buildingId);

  revalidatePath(`/admin/payments/${parsed.flatId}`);
  revalidatePath("/admin");
});

const markChargePaidSchema = z.object({
  id: z.string().uuid(),
  flatId: z.string().uuid(),
  paymentDate: z.string().min(1),
});

export const markChargePaid = withErrors(async (formData: FormData) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const parsed = markChargePaidSchema.parse({
    id: formData.get("id"),
    flatId: formData.get("flatId"),
    paymentDate: formData.get("paymentDate"),
  });
  const charge = await prisma.additionalCharge.findFirst({
    where: { id: parsed.id, flat: { floor: { buildingId } } },
  });
  if (!charge) throw new Error("Charge not found");

  await prisma.additionalCharge.update({
    where: { id: parsed.id },
    data: { status: "PAID", paymentDate: new Date(parsed.paymentDate) },
  });
  await logAudit(actor.id, "MARK_PAID", "AdditionalCharge", parsed.id, undefined, buildingId);

  revalidatePath(`/admin/payments/${parsed.flatId}`);
  revalidatePath("/admin");
});

export const deleteCharge = withErrors(async (id: string) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const charge = await prisma.additionalCharge.findFirst({
    where: { id, flat: { floor: { buildingId } } },
  });
  if (!charge) throw new Error("Charge not found");
  await prisma.additionalCharge.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "AdditionalCharge", id, undefined, buildingId);
  revalidatePath(`/admin/payments/${charge.flatId}`);
  revalidatePath("/admin");
});

const markUnpaidSchema = z.object({
  flatId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

export async function markPaymentUnpaid(formData: FormData) {
  const { profile: actor, buildingId } = await requireAdminContext();

  const parsed = markUnpaidSchema.parse({
    flatId: formData.get("flatId"),
    month: formData.get("month"),
    year: formData.get("year"),
  });
  await requireFlatInBuilding(parsed.flatId, buildingId);

  const deleted = await prisma.maintenancePayment
    .delete({
      where: { flatId_month_year: { flatId: parsed.flatId, month: parsed.month, year: parsed.year } },
    })
    .catch(() => null); // No row means it was already unpaid (default state) — nothing to do.
  // Keep what was deleted in the audit log so a mistaken "Mark Unpaid" can be re-entered.
  await logAudit(actor.id, "MARK_UNPAID", "MaintenancePayment", parsed.flatId, {
    month: parsed.month,
    year: parsed.year,
    amount: deleted?.amount.toString(),
    paymentDate: deleted?.paymentDate?.toISOString().slice(0, 10),
    paymentMethod: deleted?.paymentMethod,
    notes: deleted?.notes,
  }, buildingId);

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}
