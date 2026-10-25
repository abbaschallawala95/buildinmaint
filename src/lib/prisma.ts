import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Opening a connection to the (far-away) database takes seconds, so keep idle ones for 5 min
// instead of pg's default 10 s — otherwise every click after a short pause reconnects.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, idleTimeoutMillis: 300_000 });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
