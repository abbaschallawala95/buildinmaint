import "server-only";
import { prisma } from "@/lib/prisma";

// Returns the settings row for a building, creating it with defaults on first access
// (a building normally gets one at creation time via createBuilding, so this is a fallback).
export async function getSettings(buildingId: string) {
  const existing = await prisma.settings.findUnique({ where: { buildingId } });
  if (existing) return existing;
  return prisma.settings.create({ data: { buildingId } });
}
