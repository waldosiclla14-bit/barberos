// Tests de casos críticos FASE 2 (seccion 91 del prompt maestro).
// Ejecuta contra la BD local. No modifica datos demo existentes salvo
// crear/cancelar reservas de prueba que limpia al final.
//
// Uso: npx tsx scripts/test-fase2.ts

import "dotenv/config";
import { createPrismaAdapter } from "../src/lib/db-adapters";
import { PrismaClient } from "../src/generated/prisma/client";
import crypto from "node:crypto";

import { getAvailability } from "../src/lib/scheduling/availability";
import {
  createAppointmentSafe,
  transitionAppointment,
} from "../src/lib/scheduling/appointments";
import { addDaysToKey, todayLima } from "../src/lib/scheduling/time";

const prisma = new PrismaClient({ adapter: createPrismaAdapter(process.env.DATABASE_URL!) });

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: "demo-barberia-central" },
  });
  const branch = await prisma.branch.findFirstOrThrow({
    where: { tenantId: tenant.id },
  });
  const [carlos, luis] = await prisma.barber.findMany({
    where: { tenantId: tenant.id, displayName: { in: ["Carlos", "Luis"] } },
    orderBy: { displayName: "asc" },
  });
  const [corte, corteBarba] = await prisma.service.findMany({
    where: { tenantId: tenant.id, name: { in: ["Corte clásico", "Corte + barba"] } },
    orderBy: { name: "asc" },
  });
  if (!carlos || !luis || !corte || !corteBarba) throw new Error("Falta seed");

  // Fecha futura que no sea domingo (sede cerrada)
  let dateKey = addDaysToKey(todayLima(), 1);
  while ([0].includes(new Date(`${dateKey}T12:00:00`).getDay())) {
    dateKey = addDaysToKey(dateKey, 1);
  }

  console.log(`\n■ Motor de disponibilidad (${dateKey}, Carlos)`);

  const avail1 = await getAvailability({
    tenantId: tenant.id,
    branchId: branch.id,
    dateKey,
    serviceIds: [corte.id],
    barberId: carlos.id,
  });
  check("Genera slots reales", avail1.anyBarber.length > 0);
  check(
    "Slots alineados a pasos de 15 min",
    avail1.anyBarber.every((s) => new Date(s.start).getUTCMinutes() % 15 === 0),
  );

  // Caso C: servicio de 60 min nunca termina después del cierre (19:00 Lima)
  const closingUtc = limaDayClose(dateKey);
  check(
    "Ningún slot excede el cierre de sede",
    avail1.anyBarber.every((s) => new Date(s.end) <= closingUtc),
  );

  console.log("\n■ Caso A: doble reserva simultánea");
  const firstSlot = avail1.anyBarber[0];
  const start = new Date(firstSlot.start);

  const r1 = await createAppointmentSafe({
    tenantId: tenant.id,
    branchId: branch.id,
    barberId: carlos.id,
    serviceIds: [corte.id],
    startsAt: start,
    customer: { name: "[TEST] Cliente A", phone: "900000001" },
    source: "ONLINE",
  });
  check("Primera reserva OK", r1.ok);

  const r2 = await createAppointmentSafe({
    tenantId: tenant.id,
    branchId: branch.id,
    barberId: carlos.id,
    serviceIds: [corte.id],
    startsAt: start,
    customer: { name: "[TEST] Cliente B", phone: "900000002" },
    source: "ONLINE",
  });
  check("Segunda reserva en mismo slot RECHAZADA", !r2.ok && r2.error.includes("ocup"));

  const avail2 = await getAvailability({
    tenantId: tenant.id,
    branchId: branch.id,
    dateKey,
    serviceIds: [corte.id],
    barberId: carlos.id,
  });
  check(
    "Slot ocupado desaparece de disponibilidad",
    !avail2.anyBarber.some((s) => s.start === firstSlot.start),
  );

  console.log("\n■ Caso B: día libre del barbero");
  // Encontrar un lunes futuro (Luis descansa los lunes)
  let monday = addDaysToKey(todayLima(), 1);
  while (new Date(`${monday}T12:00:00`).getDay() !== 1) {
    monday = addDaysToKey(monday, 1);
  }
  const luisMonday = await getAvailability({
    tenantId: tenant.id,
    branchId: branch.id,
    dateKey: monday,
    serviceIds: [corte.id],
    barberId: luis.id,
  });
  check("Luis NO aparece disponible su día libre", luisMonday.anyBarber.length === 0);

  console.log("\n■ Caso D: cancelar libera el horario");
  if (r1.ok) {
    const cancel = await transitionAppointment(tenant.id, r1.appointmentId, "CANCEL", {
      cancelReason: "test",
    });
    check("Cancelación exitosa", cancel.ok);
    const avail3 = await getAvailability({
      tenantId: tenant.id,
      branchId: branch.id,
      dateKey,
      serviceIds: [corte.id],
      barberId: carlos.id,
    });
    check(
      "Horario vuelve a estar disponible",
      avail3.anyBarber.some((s) => s.start === firstSlot.start),
    );
  }

  console.log("\n■ Caso E: registro de NO_SHOW");
  const slotE = avail2.anyBarber[0];
  if (slotE) {
    const re = await createAppointmentSafe({
      tenantId: tenant.id,
      branchId: branch.id,
      barberId: carlos.id,
      serviceIds: [corte.id],
      startsAt: new Date(slotE.start),
      customer: { id: await anyCustomer(tenant.id) },
      source: "INTERNAL",
    });
    if (re.ok) {
      const ns = await transitionAppointment(tenant.id, re.appointmentId, "NO_SHOW");
      check("Transición a NO_SHOW permitida", ns.ok);
      // limpieza
      await prisma.appointment.delete({ where: { id: re.appointmentId } });
    }
  }

  console.log("\n■ Caso C extra: duración completa");
  const avail60 = await getAvailability({
    tenantId: tenant.id,
    branchId: branch.id,
    dateKey,
    serviceIds: [corteBarba.id], // 60 min
    barberId: carlos.id,
  });
  check(
    "Servicio 60min: todos los slots caben completos",
    avail60.anyBarber.every((s) => new Date(s.end) <= closingUtc),
  );

  // Limpieza de reservas de prueba (primero citas, luego clientes)
  const testCustomers = await prisma.customer.findMany({
    where: { tenantId: tenant.id, name: { startsWith: "[TEST]" } },
    select: { id: true },
  });
  for (const c of testCustomers) {
    await prisma.appointment.deleteMany({ where: { customerId: c.id } });
  }
  await prisma.customer.deleteMany({
    where: { tenantId: tenant.id, name: { startsWith: "[TEST]" } },
  });

  // ---- Sesión de prueba para verificación HTTP
  const owner = await prisma.user.findFirstOrThrow({
    where: { tenantId: tenant.id, role: "OWNER" },
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
  console.log(`\nSESSION_TOKEN=${token}`);

  console.log(`\nRESULTADO: ${passed} pasan, ${failed} fallan`);
  if (failed > 0) process.exitCode = 1;
}

function limaDayClose(dateKey: string): Date {
  const d = parseKey(dateKey);
  // 19:00 Lima (UTC-5) = medianoche UTC del día siguiente
  return new Date(Date.UTC(d.y, d.m - 1, d.d + 1));
}
function parseKey(k: string) {
  const [y, m, d] = k.split("-").map(Number);
  return { y, m, d };
}
async function anyCustomer(tenantId: string): Promise<string> {
  const c = await prisma.customer.findFirstOrThrow({
    where: { tenantId },
    select: { id: true },
  });
  return c.id;
}

// import perezoso para evitar duplicado
import { limaDayRange } from "../src/lib/scheduling/time";
void limaDayRange;

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
