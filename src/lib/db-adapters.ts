// Selección de adapter Prisma según DATABASE_URL.
// Prisma 7 usa driver adapters (query compiler): el mismo cliente generado
// funciona contra ambos dialectos; aquí solo se elige el driver.
//   - "file:" / *.db / *.sqlite → SQLite local (desarrollo/tests)
//   - postgres(ql):// → PostgreSQL (producción)
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

export type PrismaAdapter = PrismaBetterSqlite3 | PrismaPg;

export function isSqliteUrl(url: string): boolean {
  return (
    url.startsWith("file:") || url.endsWith(".db") || url.endsWith(".sqlite")
  );
}

export function isPostgresUrl(url: string): boolean {
  return /^postgres(ql)?:\/\//i.test(url);
}

export function createPrismaAdapter(url: string): PrismaAdapter {
  if (!url) {
    throw new Error("DATABASE_URL no está definida");
  }
  if (isSqliteUrl(url)) {
    return new PrismaBetterSqlite3({ url });
  }
  if (isPostgresUrl(url)) {
    return new PrismaPg({ connectionString: url });
  }
  throw new Error("DATABASE_URL sin adapter soportado (sqlite | postgresql).");
}