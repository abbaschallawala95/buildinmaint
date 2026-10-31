"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { withErrors } from "@/lib/action-result";

async function requireCategory(id: string, buildingId: string) {
  const category = await prisma.electricityBillCategory.findFirst({ where: { id, buildingId } });
  if (!category) throw new Error("Category not found");
  return category;
}

const billSchema = z.object({
  categoryId: z.string().uuid("Choose a category."),
  billingPeriodStart: z.string().min(1),
  billingPeriodEnd: z.string().min(1),
  amount: z.coerce.number().positive(),
  dueDate: z.string().min(1),
});

export const createBill = withErrors(async (formData: FormData) => {
  const { profile: admin, buildingId } = await requireAdminContext();
  const parsed = billSchema.parse({
    categoryId: formData.get("categoryId"),
    billingPeriodStart: formData.get("billingPeriodStart"),
    billingPeriodEnd: formData.get("billingPeriodEnd"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
  });
  const category = await requireCategory(parsed.categoryId, buildingId);

  const bill = await prisma.electricityBill.create({
    data: {
      buildingId,
      categoryId: category.id,
      billingPeriodStart: new Date(parsed.billingPeriodStart),
      billingPeriodEnd: new Date(parsed.billingPeriodEnd),
      amount: parsed.amount,
      dueDate: new Date(parsed.dueDate),
      recordedById: admin.id,
    },
  });
  await logAudit(admin.id, "CREATE", "ElectricityBill", bill.id, {
    category: category.name,
    amount: parsed.amount,
  }, buildingId);

  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
});

export const updateBill = withErrors(async (formData: FormData) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = billSchema.parse({
    categoryId: formData.get("categoryId"),
    billingPeriodStart: formData.get("billingPeriodStart"),
    billingPeriodEnd: formData.get("billingPeriodEnd"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
  });
  const bill = await prisma.electricityBill.findFirst({ where: { id, buildingId } });
  if (!bill) throw new Error("Bill not found");
  const category = await requireCategory(parsed.categoryId, buildingId);

  await prisma.electricityBill.update({
    where: { id },
    data: {
      categoryId: category.id,
      billingPeriodStart: new Date(parsed.billingPeriodStart),
      billingPeriodEnd: new Date(parsed.billingPeriodEnd),
      amount: parsed.amount,
      dueDate: new Date(parsed.dueDate),
    },
  });
  await logAudit(actor.id, "UPDATE", "ElectricityBill", id, {
    category: category.name,
    amount: parsed.amount,
  }, buildingId);

  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
});

export const deleteBill = withErrors(async (id: string) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const bill = await prisma.electricityBill.findFirst({ where: { id, buildingId } });
  if (!bill) throw new Error("Bill not found");
  await prisma.electricityBill.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "ElectricityBill", id, undefined, buildingId);
  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
});

const markPaidSchema = z.object({
  id: z.string().uuid(),
  paymentDate: z.string().min(1),
});

export const markBillPaid = withErrors(async (formData: FormData) => {
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
});

export const markBillUnpaid = withErrors(async (id: string) => {
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
});

const categorySchema = z.object({ name: z.string().trim().min(1) });

export const createBillCategory = withErrors(async (formData: FormData) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const parsed = categorySchema.parse({ name: formData.get("name") });
  const category = await prisma.electricityBillCategory.create({ data: { ...parsed, buildingId } });
  await logAudit(actor.id, "CREATE", "ElectricityBillCategory", category.id, { name: parsed.name }, buildingId);
  revalidatePath("/admin/electricity");
});

export const renameBillCategory = withErrors(async (formData: FormData) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = categorySchema.parse({ name: formData.get("name") });
  const category = await requireCategory(id, buildingId);
  await prisma.electricityBillCategory.update({ where: { id }, data: { name: parsed.name } });
  await logAudit(actor.id, "UPDATE", "ElectricityBillCategory", id, { from: category.name, to: parsed.name }, buildingId);
  revalidatePath("/admin/electricity");
  revalidatePath("/admin");
});

export const deleteBillCategory = withErrors(async (id: string) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const category = await prisma.electricityBillCategory.findFirst({
    where: { id, buildingId },
    include: { _count: { select: { bills: true } } },
  });
  if (!category) throw new Error("Category not found");
  if (category._count.bills > 0) {
    throw new Error(`"${category.name}" is used by ${category._count.bills} bill(s). Change their category first.`);
  }
  await prisma.electricityBillCategory.delete({ where: { id } });
  await logAudit(actor.id, "DELETE", "ElectricityBillCategory", id, { name: category.name }, buildingId);
  revalidatePath("/admin/electricity");
});
