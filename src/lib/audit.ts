import "server-only";
import { prisma } from "@/lib/prisma";

type JsonDetails = Record<string, string | number | boolean | null | undefined>;

export function logAudit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  details?: JsonDetails,
  buildingId?: string | null,
) {
  return prisma.auditLog.create({
    data: { actorId, action, entityType, entityId, details: details ?? undefined, buildingId },
  });
}
