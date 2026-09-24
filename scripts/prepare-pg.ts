// Genera prisma/schema.pg.prisma (provider postgresql) a partir del schema
// canónico (sqlite) sin duplicar el modelo: solo se reemplaza el provider.
// El resto de la definición (modelos) se copia literal.
//
// Uso:             npx tsx scripts/prepare-pg.ts              (escribe el archivo)
// Verificación:    npx prisma validate --config prisma.config.pg.ts
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CANONICAL = resolve("prisma/schema.prisma");
const OUTPUT = resolve("prisma/schema.pg.prisma");

const src = readFileSync(CANONICAL, "utf8");

const pg = "postgresql";
if (!src.includes('provider = "sqlite"')) {
  throw new Error("Provider sqlite no encontrado en " + CANONICAL);
}
const out = src.replace(
  'provider = "sqlite"',
  `provider = "${pg}"`,
);

writeFileSync(OUTPUT, out);
console.log("OK: " + OUTPUT);
console.log(
  "Siguiente paso (con DATABASE_URL apuntando a tu PostgreSQL):\n" +
    "  npx prisma validate --config prisma.config.pg.ts\n" +
    '  npx prisma db push --config prisma.config.pg.ts  # crear esquema\n' +
    "  npm run db:seed                                 # datos demo\n" +
    "  npx tsx scripts/mint-session.ts                  # sanity",
);