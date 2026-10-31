import "server-only";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = ["Lift", "Common Area"];

// New buildings (and ones whose categories were all removed) start with the two usual bill types.
export async function ensureDefaultElectricityCategories(buildingId: string) {
  const count = await prisma.electricityBillCategory.count({ where: { buildingId } });
  if (count > 0) return;
  await prisma.electricityBillCategory.createMany({
    data: DEFAULT_CATEGORIES.map((name) => ({ name, buildingId })),
    skipDuplicates: true,
  });
}
