// Cliente Prisma singleton (evita múltiples instancias en dev con HMR)
//
// Prisma 7 usa driver adapters (query compiler).
// - Desarrollo local: SQLite vía @prisma/adapter-better-sqlite3
// - Producción: PostgreSQL vía @prisma/adapter-pg
// El adapter se elige según el prefijo de DATABASE_URL (ver ./db-adapters).
import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaAdapter } from "@/lib/db-adapters";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  return new PrismaClient({ adapter: createPrismaAdapter(url ?? "") });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}