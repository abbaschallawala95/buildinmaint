"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const expenseSchema = z.object({
  categoryId: z.string().uuid(),
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
});

export async function createExpense(formData: FormData) {
  const { profile: admin, buildingId } = await requireAdminContext();
  const parsed = expenseSchema.parse({
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    date: formData.get("date"),
  });
  const category = await prisma.expenseCategory.findFirst({ where: { id: parsed.categoryId, buildingId } });
  if (!category) throw new Error("Category not found");

  const expense = await prisma.expense.create({
    data: { ...parsed, date: new Date(parsed.date), recordedById: admin.id, buildingId },
  });
  await logAudit(admin.id, "CREATE", "Expense", expense.id, {
    description: parsed.description,
    amount: parsed.amount,
  }, buildingId);

  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}

export async function updateExpense(formData: FormData) {
  const { profile: actor, buildingId } = await requireAdminContext();
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = expenseSchema.parse({
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    date: formData.get("date"),
  });
  const expense = await prisma.expense.findFirst({ where: { id, buildingId } });
  if (!expense) throw new Error("Expense not found");
  const category = await prisma.expenseCategory.findFirst({ where: { id: parsed.categoryId, buildingId } });
  if (!category) throw new Error("Category not found");

  await prisma.expense.update({
    where: { id },
    data: { ...parsed, date: new Date(parsed.date) },
  });
  await logAudit(actor.id, "UPDATE", "Expense", id, {
    description: parsed.description,
    amount: parsed.amount,
  }, buildingId);

  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}

export async function deleteExpense(id: string) {
  const { profile: actor, buildingId } = await requireAdminContext();
  const expense = await prisma.expense.findFirst({ where: { id, buildingId } });
  if (!expense) throw new Error("Expense not found");
  await prisma.expense.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "Expense", id, undefined, buildingId);
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}

const categorySchema = z.object({ name: z.string().min(1) });

export async function createCategory(formData: FormData) {
  const { profile: actor, buildingId } = await requireAdminContext();
  const parsed = categorySchema.parse({ name: formData.get("name") });
  const category = await prisma.expenseCategory.create({ data: { ...parsed, buildingId } });
  await logAudit(actor.id, "CREATE", "ExpenseCategory", category.id, { name: parsed.name }, buildingId);
  revalidatePath("/admin/expenses");
}
