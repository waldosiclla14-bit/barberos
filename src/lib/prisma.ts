// Cliente Prisma singleton (evita múltiples instancias en dev con HMR)
//
// Prisma 7 usa driver adapters (query compiler).
// - Desarrollo local: SQLite vía @prisma/adapter-better-sqlite3
// - Producción (PostgreSQL): instalar @prisma/adapter-pg y agregar la rama correspondiente.
//   Ej: new PrismaPg({ connectionString: process.env.DATABASE_URL })
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está definida");
  }

  if (url.startsWith("file:") || url.endsWith(".db") || url.endsWith(".sqlite")) {
    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({ adapter });
  }

  // PostgreSQL u otros: configurar adapter específico aquí.
  throw new Error(
    "Adapter no configurado para esta DATABASE_URL. Instala @prisma/adapter-pg para PostgreSQL.",
  );
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
