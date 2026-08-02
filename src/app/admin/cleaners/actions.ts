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

  const now = new Date();
  const cleaner = await prisma.cleaner.create({
    data: {
      ...parsed,
      salaryHistory: {
        create: { amount: parsed.monthlySalary, effectiveMonth: now.getMonth() + 1, effectiveYear: now.getFullYear() },
      },
    },
  });
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

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  await prisma.$transaction([
    prisma.cleaner.update({
      where: { id: parsed.id },
      data: { name: parsed.name, monthlySalary: parsed.monthlySalary },
    }),
    prisma.cleanerSalaryHistory.upsert({
      where: { cleanerId_effectiveMonth_effectiveYear: { cleanerId: parsed.id, effectiveMonth: month, effectiveYear: year } },
      create: { cleanerId: parsed.id, amount: parsed.monthlySalary, effectiveMonth: month, effectiveYear: year },
      update: { amount: parsed.monthlySalary },
    }),
  ]);
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

const addPaymentSchema = z.object({
  cleanerId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
  amount: z.coerce.number().positive(),
  paymentDate: z.string().min(1),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]),
  notes: z.string().optional(),
});

export async function addCleanerPaymentEntry(formData: FormData) {
  const admin = await requireRole("SUPER_ADMIN");
  const parsed = addPaymentSchema.parse({
    cleanerId: formData.get("cleanerId"),
    month: formData.get("month"),
    year: formData.get("year"),
    amount: formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes") || undefined,
  });

  const payment = await prisma.cleanerPayment.upsert({
    where: { cleanerId_month_year: { cleanerId: parsed.cleanerId, month: parsed.month, year: parsed.year } },
    create: { cleanerId: parsed.cleanerId, month: parsed.month, year: parsed.year },
    update: {},
  });

  const entry = await prisma.cleanerPaymentEntry.create({
    data: {
      cleanerPaymentId: payment.id,
      amount: parsed.amount,
      paymentDate: new Date(parsed.paymentDate),
      paymentMethod: parsed.paymentMethod,
      notes: parsed.notes,
      recordedById: admin.id,
    },
  });
  await logAudit(admin.id, "CREATE", "CleanerPaymentEntry", entry.id, {
    month: parsed.month,
    year: parsed.year,
    amount: parsed.amount,
  });

  revalidatePath("/admin/cleaners");
  revalidatePath("/admin");
}

export async function deleteCleanerPaymentEntry(id: string) {
  const admin = await requireRole("SUPER_ADMIN");
  await prisma.cleanerPaymentEntry.delete({ where: { id } });
  await logAudit(admin.id, "DELETE", "CleanerPaymentEntry", id);

  revalidatePath("/admin/cleaners");
  revalidatePath("/admin");
}
