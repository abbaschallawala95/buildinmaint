"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { withErrors } from "@/lib/action-result";

// Previous dues: AdditionalCharge rows with previousDueType set. Every lookup is scoped to
// the admin's building, so a guessed id from another building matches nothing.

function refresh(flatId: string) {
  revalidatePath("/admin/maintenance");
  revalidatePath(`/admin/payments/${flatId}`);
  revalidatePath("/admin");
  revalidatePath("/member");
}

async function findPreviousDue(id: string, buildingId: string) {
  const due = await prisma.additionalCharge.findFirst({
    where: { id, previousDueType: { not: null }, flat: { floor: { buildingId } } },
  });
  if (!due) throw new Error("That previous due no longer exists.");
  return due;
}

const dueSchema = z.object({
  id: z.string().uuid().optional(),
  flatId: z.string().uuid(),
  type: z.enum(["MAINTENANCE", "OTHER"]),
  description: z.string().trim().min(1, "Add a note, e.g. “Maintenance dues 2025”."),
  amount: z.coerce.number().positive(),
  dueDate: z.string().optional(),
  paymentDate: z.string().optional(),
});

// Creates a previous due, or updates one when `id` is given.
export const savePreviousDue = withErrors(async (formData: FormData) => {
  const { profile: admin, buildingId } = await requireAdminContext();
  const parsed = dueSchema.parse({
    id: formData.get("id") || undefined,
    flatId: formData.get("flatId"),
    type: formData.get("type"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate") || undefined,
    paymentDate: formData.get("paymentDate") || undefined,
  });
  const flat = await prisma.flat.findFirst({ where: { id: parsed.flatId, floor: { buildingId } } });
  if (!flat) throw new Error("Flat not found");

  const data = {
    flatId: parsed.flatId,
    previousDueType: parsed.type,
    description: parsed.description,
    amount: parsed.amount,
    dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
  };
  const details = { flat: flat.flatNumber, type: parsed.type, description: parsed.description, amount: parsed.amount };

  if (parsed.id) {
    const existing = await findPreviousDue(parsed.id, buildingId);
    await prisma.additionalCharge.update({
      where: { id: parsed.id },
      // A paid entry keeps its status; only its payment date can change here.
      data: { ...data, ...(existing.status === "PAID" && parsed.paymentDate && { paymentDate: new Date(parsed.paymentDate) }) },
    });
    await logAudit(admin.id, "UPDATE_PREVIOUS_DUE", "AdditionalCharge", parsed.id, details, buildingId);
    if (existing.flatId !== parsed.flatId) refresh(existing.flatId);
  } else {
    const due = await prisma.additionalCharge.create({ data: { ...data, recordedById: admin.id } });
    await logAudit(admin.id, "ADD_PREVIOUS_DUE", "AdditionalCharge", due.id, details, buildingId);
  }
  refresh(parsed.flatId);
});

export const deletePreviousDue = withErrors(async (id: string) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const due = await findPreviousDue(z.string().uuid().parse(id), buildingId);
  await prisma.additionalCharge.delete({ where: { id: due.id } });
  // Keep what was deleted so a mistake can be re-entered.
  await logAudit(actor.id, "DELETE_PREVIOUS_DUE", "AdditionalCharge", due.id, {
    description: due.description,
    amount: due.amount.toString(),
    status: due.status,
  }, buildingId);
  refresh(due.flatId);
});

export const markPreviousDuePaid = withErrors(async (formData: FormData) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const id = z.string().uuid().parse(formData.get("id"));
  const paymentDate = z.string().min(1).parse(formData.get("paymentDate"));
  const due = await findPreviousDue(id, buildingId);
  await prisma.additionalCharge.update({ where: { id }, data: { status: "PAID", paymentDate: new Date(paymentDate) } });
  await logAudit(actor.id, "MARK_PAID", "AdditionalCharge", id, { description: due.description, paymentDate }, buildingId);
  refresh(due.flatId);
});

export const markPreviousDueUnpaid = withErrors(async (id: string) => {
  const { profile: actor, buildingId } = await requireAdminContext();
  const due = await findPreviousDue(z.string().uuid().parse(id), buildingId);
  await prisma.additionalCharge.update({ where: { id: due.id }, data: { status: "UNPAID", paymentDate: null } });
  await logAudit(actor.id, "MARK_UNPAID", "AdditionalCharge", due.id, {
    description: due.description,
    paymentDate: due.paymentDate?.toISOString().slice(0, 10),
  }, buildingId);
  refresh(due.flatId);
});
