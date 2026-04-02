import { PrismaClient } from "@prisma/client";
import { getPrismaSqliteDatasourceUrl } from "@/lib/sqlite-url";

const sqliteUrl = getPrismaSqliteDatasourceUrl();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(sqliteUrl ? { datasources: { db: { url: sqliteUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
