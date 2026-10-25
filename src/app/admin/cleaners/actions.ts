"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { parseEffectiveFrom, rateForMonth } from "@/lib/rate-history";
import { withErrors } from "@/lib/action-result";

const cleanerSchema = z.object({
  name: z.string().min(1),
  monthlySalary: z.coerce.number().positive(),
});

export const createCleaner = withErrors(async (formData: FormData) => {
  const { profile: admin, buildingId } = await requireAdminContext();
  const parsed = cleanerSchema.parse({
    name: formData.get("name"),
    monthlySalary: formData.get("monthlySalary"),
  });

  const from = parseEffectiveFrom(formData.get("effectiveFrom"));
  const cleaner = await prisma.cleaner.create({
    data: {
      ...parsed,
      buildingId,
      salaryHistory: {
        create: { amount: parsed.monthlySalary, effectiveMonth: from.month, effectiveYear: from.year },
      },
    },
  });
  await logAudit(admin.id, "CREATE", "Cleaner", cleaner.id, parsed, buildingId);

  revalidatePath("/admin/cleaners");
});

const updateCleanerSchema = cleanerSchema.extend({ id: z.string().uuid() });

export const updateCleaner = withErrors(async (formData: FormData) => {
  const { profile: admin, buildingId } = await requireAdminContext();
  const parsed = updateCleanerSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    monthlySalary: formData.get("monthlySalary"),
  });
  const cleaner = await prisma.cleaner.findFirst({ where: { id: parsed.id, buildingId } });
  if (!cleaner) throw new Error("Cleaner not found");

  const { month, year } = parseEffectiveFrom(formData.get("effectiveFrom"));

  await prisma.$transaction(async (tx) => {
    await tx.cleanerSalaryHistory.upsert({
      where: { cleanerId_effectiveMonth_effectiveYear: { cleanerId: parsed.id, effectiveMonth: month, effectiveYear: year } },
      create: { cleanerId: parsed.id, amount: parsed.monthlySalary, effectiveMonth: month, effectiveYear: year },
      update: { amount: parsed.monthlySalary },
    });
    // A back-dated change may be superseded by a later one, so store the salary in effect today.
    const history = await tx.cleanerSalaryHistory.findMany({ where: { cleanerId: parsed.id } });
    const now = new Date();
    const current = rateForMonth(
      history.map((h) => ({ amount: Number(h.amount), effectiveMonth: h.effectiveMonth, effectiveYear: h.effectiveYear })),
      now.getMonth() + 1,
      now.getFullYear(),
    );
    await tx.cleaner.update({ where: { id: parsed.id }, data: { name: parsed.name, monthlySalary: current } });
  });
  await logAudit(admin.id, "UPDATE", "Cleaner", parsed.id, {
    ...parsed,
    effectiveFrom: `${year}-${String(month).padStart(2, "0")}`,
  }, buildingId);

  revalidatePath("/admin/cleaners");
});

export const deleteCleaner = withErrors(async (id: string) => {
  const { profile: admin, buildingId } = await requireAdminContext();
  const cleaner = await prisma.cleaner.findFirst({ where: { id, buildingId } });
  if (!cleaner) throw new Error("Cleaner not found");
  await prisma.cleaner.delete({ where: { id } });
  await logAudit(admin.id, "DELETE", "Cleaner", id, undefined, buildingId);

  revalidatePath("/admin/cleaners");
  revalidatePath("/admin");
});

const addPaymentSchema = z.object({
  cleanerId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
  amount: z.coerce.number().positive(),
  paymentDate: z.string().min(1),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]),
  notes: z.string().optional(),
});

export const addCleanerPaymentEntry = withErrors(async (formData: FormData) => {
  const { profile: admin, buildingId } = await requireAdminContext();
  const parsed = addPaymentSchema.parse({
    cleanerId: formData.get("cleanerId"),
    month: formData.get("month"),
    year: formData.get("year"),
    amount: formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes") || undefined,
  });
  const cleaner = await prisma.cleaner.findFirst({ where: { id: parsed.cleanerId, buildingId } });
  if (!cleaner) throw new Error("Cleaner not found");

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
  }, buildingId);

  revalidatePath("/admin/cleaners");
  revalidatePath("/admin");
});

export const deleteCleanerPaymentEntry = withErrors(async (id: string) => {
  const { profile: admin, buildingId } = await requireAdminContext();
  const entry = await prisma.cleanerPaymentEntry.findFirst({
    where: { id, cleanerPayment: { cleaner: { buildingId } } },
  });
  if (!entry) throw new Error("Payment entry not found");
  await prisma.cleanerPaymentEntry.delete({ where: { id } });
  await logAudit(admin.id, "DELETE", "CleanerPaymentEntry", id, undefined, buildingId);

  revalidatePath("/admin/cleaners");
  revalidatePath("/admin");
});
