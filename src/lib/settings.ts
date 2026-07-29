import "server-only";
import { prisma } from "@/lib/prisma";

// Settings is a singleton table — this returns the one row, creating it with
// defaults on first access.
export async function getSettings() {
  const existing = await prisma.settings.findFirst();
  if (existing) return existing;
  return prisma.settings.create({ data: {} });
}
