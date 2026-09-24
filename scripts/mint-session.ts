// Verifica/minta sesión OWNER y devuelve IDs para smoke HTTP.
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import crypto from "node:crypto";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, expiresAt: true, createdAt: true },
  });
  console.log("Sesiones recientes:", JSON.stringify(sessions));

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: "demo-barberia-central" },
  });
  const owner = await prisma.user.findFirstOrThrow({
    where: { tenantId: tenant.id, role: "OWNER" },
    select: { id: true },
  });
  const branch = await prisma.branch.findFirstOrThrow({
    where: { tenantId: tenant.id },
    select: { id: true },
  });
  const service = await prisma.service.findFirstOrThrow({
    where: { tenantId: tenant.id, name: "Corte clásico" },
    select: { id: true },
  });

  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      userId: owner.id,
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });
  console.log(
    JSON.stringify({ TOKEN: token, branch: branch.id, service: service.id }),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
