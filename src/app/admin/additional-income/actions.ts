"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const bulkChargeSchema = z.object({
  description: z.string().min(1),
  dueDate: z.string().optional(),
});

export async function createBulkCharge(formData: FormData) {
  const admin = await requireRole("SUPER_ADMIN");
  const { description, dueDate } = bulkChargeSchema.parse({
    description: formData.get("description"),
    dueDate: formData.get("dueDate") || undefined,
  });

  const amounts = [...formData.entries()]
    .filter(([key, value]) => key.startsWith("amount-") && Number(value) > 0)
    .map(([key, value]) => ({ flatId: key.slice("amount-".length), amount: Number(value) }));

  if (amounts.length === 0) {
    throw new Error("Enter an amount for at least one flat.");
  }

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
  });

  revalidatePath("/admin/additional-income");
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}
