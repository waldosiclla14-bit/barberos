// E2E FASE 7: crea una cita por API pública y verifica el MessageLog de confirmación.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { spawnSync } from "node:child_process";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: "demo-barberia-central" },
    select: { id: true },
  });
  const branch = await prisma.branch.findFirstOrThrow({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true },
  });
  const barber = await prisma.barber.findFirstOrThrow({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, displayName: true },
  });
  const service = await prisma.service.findFirstOrThrow({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, name: true },
  });

  const starts = new Date();
  starts.setDate(starts.getDate() + 1);
  starts.setHours(11, 0, 0, 0);

  const before = await prisma.messageLog.count({ where: { tenantId: tenant.id } });
  const body = JSON.stringify({
    branchId: branch.id,
    barberId: barber.id,
    serviceIds: [service.id],
    startsAt: starts.toISOString(),
    customer: { name: "E2E Prueba", phone: "999000111" },
  });

  const mint = spawnSync(
    "cmd.exe", ["/c", "npx tsx scripts/mint-session.ts"],
    { encoding: "utf8", shell: false },
  );
  const token = /"TOKEN":"([^"]+)"/.exec(mint.stdout ?? "")?.[1] ?? "";
  console.log("token ok:", !!token);

  const res = spawnSync(
    "curl.exe",
    ["-s", "-X", "POST", "http://localhost:3004/api/appointments",
     "-H", "Content-Type: application/json",
     "-H", `Cookie: barberos_session=${token}`, "-d", body],
    { encoding: "utf8" },
  );
  console.log("API:", res.stdout.trim());

  const after = await prisma.messageLog.count({ where: { tenantId: tenant.id } });
  const lastLog = await prisma.messageLog.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    select: { channel: true, kind: true, to: true, body: true },
  });
  console.log("MessageLog nuevo:", after - before >= 1 ? "SÍ ✓" : "NO ✗");
  console.log("Último log:", JSON.stringify(lastLog));

  const appt = await prisma.appointment.findFirst({
    where: {
      tenantId: tenant.id,
      startsAt: { gte: starts },
      customer: { name: "E2E Prueba" },
    },
    orderBy: { createdAt: "desc" },
    select: { status: true },
  });
  console.log("Cita creada:", JSON.stringify(appt ?? null));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});