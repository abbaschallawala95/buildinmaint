"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const bulkChargeSchema = z.object({
  description: z.string().min(1),
  dueDate: z.string().optional(),
});

export type BulkChargeState = { error?: string; ok?: string };

export async function createBulkCharge(_prev: BulkChargeState, formData: FormData): Promise<BulkChargeState> {
  const { profile: admin, buildingId } = await requireAdminContext();
  const parsed = bulkChargeSchema.safeParse({
    description: formData.get("description"),
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return { error: "Enter a description." };
  const { description, dueDate } = parsed.data;

  const amounts = [...formData.entries()]
    .filter(([key, value]) => key.startsWith("amount-") && Number(value) > 0)
    .map(([key, value]) => ({ flatId: key.slice("amount-".length), amount: Number(value) }));

  if (amounts.length === 0) return { error: "Enter an amount for at least one flat." };

  const flatCount = await prisma.flat.count({
    where: { id: { in: amounts.map((a) => a.flatId) }, floor: { buildingId } },
  });
  if (flatCount !== amounts.length) return { error: "One or more flats not found." };

  const charges = await prisma.$transaction(
    amounts.map(({ flatId, amount }) =>
      prisma.additionalCharge.create({
        data: {
          flatId,
          description,
          amount,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          recordedById: admin.id,
        },
      }),
    ),
  );
  await logAudit(admin.id, "CREATE_BULK", "AdditionalCharge", charges[0].id, {
    description,
    flatCount: charges.length,
  }, buildingId);

  revalidatePath("/admin/additional-income");
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  const total = amounts.reduce((sum, a) => sum + a.amount, 0);
  return { ok: `Created "${description}" for ${charges.length} flat(s), ₹${total.toLocaleString("en-IN")} in total.` };
}
