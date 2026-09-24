// Config Prisma para PostgreSQL (producción).
// Reutiliza prisma/schema.pg.prisma (generado por scripts/prepare-pg.ts).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.pg.prisma",
  migrations: {
    path: "prisma/migrations-pg",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});