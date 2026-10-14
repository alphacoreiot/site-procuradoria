import { PrismaClient } from "@prisma/client";

// Uma única instância do Prisma (evita abrir conexões a cada recarga no dev).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
