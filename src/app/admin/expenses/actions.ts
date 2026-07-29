"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const expenseSchema = z.object({
  categoryId: z.string().uuid(),
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
});

export async function createExpense(formData: FormData) {
  const admin = await requireRole("SUPER_ADMIN");
  const parsed = expenseSchema.parse({
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    date: formData.get("date"),
  });

  const expense = await prisma.expense.create({
    data: { ...parsed, date: new Date(parsed.date), recordedById: admin.id },
  });
  await logAudit(admin.id, "CREATE", "Expense", expense.id, {
    description: parsed.description,
    amount: parsed.amount,
  });

  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}

export async function updateExpense(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = expenseSchema.parse({
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    date: formData.get("date"),
  });

  await prisma.expense.update({
    where: { id },
    data: { ...parsed, date: new Date(parsed.date) },
  });
  await logAudit(actor.id, "UPDATE", "Expense", id, {
    description: parsed.description,
    amount: parsed.amount,
  });

  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}

export async function deleteExpense(id: string) {
  const actor = await requireRole("SUPER_ADMIN");
  await prisma.expense.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "Expense", id);
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}

const categorySchema = z.object({ name: z.string().min(1) });

export async function createCategory(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");
  const parsed = categorySchema.parse({ name: formData.get("name") });
  const category = await prisma.expenseCategory.create({ data: parsed });
  await logAudit(actor.id, "CREATE", "ExpenseCategory", category.id, { name: parsed.name });
  revalidatePath("/admin/expenses");
}
