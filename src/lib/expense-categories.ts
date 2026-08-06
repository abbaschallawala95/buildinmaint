import "server-only";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  "Repair & Maintenance",
  "Plumbing",
  "Electrical",
  "Security",
  "Cleaning",
  "Water Charges",
  "Miscellaneous",
];

export async function ensureDefaultExpenseCategories(buildingId: string) {
  const count = await prisma.expenseCategory.count({ where: { buildingId } });
  if (count > 0) return;
  await prisma.expenseCategory.createMany({
    data: DEFAULT_CATEGORIES.map((name) => ({ name, buildingId })),
    skipDuplicates: true,
  });
}
