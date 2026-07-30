"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const cleanerSchema = z.object({
  name: z.string().min(1),
  monthlySalary: z.coerce.number().positive(),
});

export async function createCleaner(formData: FormData) {
  const admin = await requireRole("SUPER_ADMIN");
  const parsed = cleanerSchema.parse({
    name: formData.get("name"),
    monthlySalary: formData.get("monthlySalary"),
  });

  const cleaner = await prisma.cleaner.create({ data: parsed });
  await logAudit(admin.id, "CREATE", "Cleaner", cleaner.id, parsed);

  revalidatePath("/admin/cleaners");
}

const updateCleanerSchema = cleanerSchema.extend({ id: z.string().uuid() });

export async function updateCleaner(formData: FormData) {
  const admin = await requireRole("SUPER_ADMIN");
  const parsed = updateCleanerSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    monthlySalary: formData.get("monthlySalary"),
  });

  await prisma.cleaner.update({
    where: { id: parsed.id },
    data: { name: parsed.name, monthlySalary: parsed.monthlySalary },
  });
  await logAudit(admin.id, "UPDATE", "Cleaner", parsed.id, parsed);

  revalidatePath("/admin/cleaners");
}

export async function deleteCleaner(id: string) {
  const admin = await requireRole("SUPER_ADMIN");
  await prisma.cleaner.delete({ where: { id } });
  await logAudit(admin.id, "DELETE", "Cleaner", id);

  revalidatePath("/admin/cleaners");
  revalidatePath("/admin");
}

const markPaidSchema = z.object({
  cleanerId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
  amount: z.coerce.number().nonnegative(),
  paymentDate: z.string().min(1),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]),
});

export async function markCleanerPaid(formData: FormData) {
  const admin = await requireRole("SUPER_ADMIN");
  const parsed = markPaidSchema.parse({
    cleanerId: formData.get("cleanerId"),
    month: formData.get("month"),
    year: formData.get("year"),
    amount: formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    paymentMethod: formData.get("paymentMethod"),
  });

  const payment = await prisma.cleanerPayment.upsert({
    where: {
      cleanerId_month_year: { cleanerId: parsed.cleanerId, month: parsed.month, year: parsed.year },
    },
    create: {
      cleanerId: parsed.cleanerId,
      month: parsed.month,
      year: parsed.year,
      amount: parsed.amount,
      status: "PAID",
      paymentDate: new Date(parsed.paymentDate),
      paymentMethod: parsed.paymentMethod,
      recordedById: admin.id,
    },
    update: {
      amount: parsed.amount,
      status: "PAID",
      paymentDate: new Date(parsed.paymentDate),
      paymentMethod: parsed.paymentMethod,
      recordedById: admin.id,
    },
  });
  await logAudit(admin.id, "MARK_PAID", "CleanerPayment", payment.id, {
    month: parsed.month,
    year: parsed.year,
    amount: parsed.amount,
  });

  revalidatePath("/admin/cleaners");
  revalidatePath("/admin");
}

const markUnpaidSchema = z.object({
  cleanerId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

export async function markCleanerUnpaid(formData: FormData) {
  const admin = await requireRole("SUPER_ADMIN");
  const parsed = markUnpaidSchema.parse({
    cleanerId: formData.get("cleanerId"),
    month: formData.get("month"),
    year: formData.get("year"),
  });

  await prisma.cleanerPayment
    .delete({
      where: {
        cleanerId_month_year: { cleanerId: parsed.cleanerId, month: parsed.month, year: parsed.year },
      },
    })
    .catch(() => {
      // No row means it was already unpaid (default state) — nothing to do.
    });
  await logAudit(admin.id, "MARK_UNPAID", "CleanerPayment", parsed.cleanerId, {
    month: parsed.month,
    year: parsed.year,
  });

  revalidatePath("/admin/cleaners");
  revalidatePath("/admin");
}
