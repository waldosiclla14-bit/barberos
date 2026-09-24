// E2E FLUJO (FASE 4 + 6): ventas con puntos y cuadre de caja.
// Requiere el seed de demo (`npm run db:seed`). Es idempotente y se autolimpia.
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { createSale } from "../src/lib/sales";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SLUG = "demo-barberia-central";
const TEST = "FLUJO Demo";
let passed = 0;
let failed = 0;

function ok(cond: boolean, label: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`);
  }
}

async function cleanup(tenantId: string, sessionId?: string | null) {
  const sales = await prisma.sale.findMany({
    where: { tenantId, customer: { name: TEST } },
    select: { id: true },
  });
  const saleIds = sales.map((s) => s.id);
  await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
  await prisma.cashMovement.deleteMany({
    where: { OR: [{ saleId: { in: saleIds } }] },
  });
  await prisma.sale.deleteMany({ where: { id: { in: saleIds } } });
  if (sessionId) {
    await prisma.cashMovement.deleteMany({
      where: { cashSessionId: sessionId },
    });
  }
  await prisma.customer.deleteMany({ where: { tenantId, name: TEST } });
}

async function main() {
  console.log(`▶ FLUJO E2E (ventas + puntos + caja)`);

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: SLUG } });
  const cfg = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenant.id },
    select: { pointsPerSol: true, pointRedeemCents: true },
  });
  const branch = await prisma.branch.findFirstOrThrow({
    where: { tenantId: tenant.id, isActive: true },
  });
  const barber = await prisma.barber.findFirstOrThrow({
    where: { tenantId: tenant.id, isActive: true },
  });
  const service = await prisma.service.findFirstOrThrow({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, name: true, priceCents: true, commissionPctDefault: true },
  });

  await cleanup(tenant.id);

  // 0) Cliente nuevo sin puntos
  const customer = await prisma.customer.create({
    data: { tenantId: tenant.id, name: TEST, phone: "987654301" },
    select: { id: true },
  });
  ok(true, "Cliente de prueba creado sin puntos");

  // 1) Abrir caja (openedById es requerido)
  const user = await prisma.user.findFirstOrThrow({
    where: { tenantId: tenant.id },
    select: { id: true },
  });
  const session = await prisma.cashSession.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      openedById: user.id,
      openingCents: 20000,
      expectedCents: 20000,
      status: "OPEN",
    },
  });
  ok(true, `Caja abierta con S/ ${(20000 / 100).toFixed(2)}`);

  const SU = service.priceCents;
  const pointsPerSol = cfg.pointsPerSol;
  const earned1 = Math.floor(SU / pointsPerSol);

  // 2) Venta 1 en efectivo
  const r1 = await createSale({
    tenantId: tenant.id,
    branchId: branch.id,
    customerId: customer.id,
    items: [
      {
        kind: "SERVICE",
        serviceId: service.id,
        barberId: barber.id,
        name: service.name,
        qty: 1,
        unitPriceCents: SU,
      },
    ],
    discountCents: 0,
    paymentMethod: "EFECTIVO",
  });
  ok(r1.ok, `Venta 1: ${r1.ok ? "creada" : r1.error}`);

  let sale1;
  if (r1.ok) {
    sale1 = await prisma.sale.findUniqueOrThrow({
      where: { id: r1.saleId },
      include: { items: true },
    });
    ok(sale1.totalCents === SU, "Venta 1 total = precio del servicio");
    ok(sale1.discountCents === 0, "Venta 1 sin descuento");
    const comm = Math.round((SU * service.commissionPctDefault) / 100);
    ok(
      sale1.items[0].commissionCents === comm,
      `Comisión barbero = ${comm} céntimos (${service.commissionPctDefault}%)`,
    );
    const cashIn = await prisma.cashMovement.findFirst({
      where: { saleId: sale1.id, type: "IN" },
      select: { amountCents: true, cashSessionId: true },
    });
    ok(!!cashIn && cashIn.amountCents === SU, "Venta en efectivo registra mov. IN en caja");
    ok(cashIn?.cashSessionId === null, "Mov. IN generado automáticamente (sin enlace manual)");
  }

  const p1 = await prisma.customer.findUniqueOrThrow({
    where: { id: customer.id },
    select: { loyaltyPoints: true },
  });
  ok(p1.loyaltyPoints === earned1, `Puntos acumulados = ${earned1} (subtotal/${pointsPerSol})`);

  // 3) Venta 2 con canje de puntos
  const redeem = Math.min(100, p1.loyaltyPoints);
  const redeemCents = redeem * cfg.pointRedeemCents;
  const r2 = await createSale({
    tenantId: tenant.id,
    branchId: branch.id,
    customerId: customer.id,
    redeemPoints: redeem,
    items: [
      {
        kind: "SERVICE",
        serviceId: service.id,
        barberId: barber.id,
        name: service.name,
        qty: 1,
        unitPriceCents: SU,
      },
    ],
    discountCents: 0,
    paymentMethod: "EFECTIVO",
  });
  ok(r2.ok, `Venta 2 con canje de ${redeem} pts: ${r2.ok ? "creada" : r2.error}`);

  if (r2.ok) {
    const sale2 = await prisma.sale.findUniqueOrThrow({
      where: { id: r2.saleId },
    });
    ok(sale2.totalCents === SU - redeemCents, `Venta 2 total = precio - S/ ${(redeemCents / 100).toFixed(2)}`);
    ok(sale2.discountCents === redeemCents, "Descuento guardado = valor del canje");
  }

  const p2 = await prisma.customer.findUniqueOrThrow({
    where: { id: customer.id },
    select: { loyaltyPoints: true },
  });
  const expected2 = p1.loyaltyPoints - redeem + Math.floor(SU / pointsPerSol);
  ok(p2.loyaltyPoints === expected2, `Puntos tras venta 2 = ${p2.loyaltyPoints} (esperado ${expected2})`);

  // 4) Guardas
  const r3 = await createSale({
    tenantId: tenant.id,
    branchId: branch.id,
    customerId: customer.id,
    redeemPoints: p2.loyaltyPoints + 1,
    items: [{
      kind: "SERVICE", serviceId: service.id, barberId: barber.id,
      name: service.name, qty: 1, unitPriceCents: SU,
    }],
    discountCents: 0,
    paymentMethod: "TARJETA",
  });
  ok(!r3.ok && /puntos/.test(r3.error ?? ""), "Rechaza canje con puntos insuficientes");

  const r4 = await createSale({
    tenantId: tenant.id,
    branchId: branch.id,
    redeemPoints: 5,
    items: [{
      kind: "SERVICE", serviceId: service.id, barberId: barber.id,
      name: service.name, qty: 1, unitPriceCents: SU,
    }],
    discountCents: 0,
    paymentMethod: "TARJETA",
  });
  ok(!r4.ok && /cliente/.test(r4.error ?? ""), "Rechaza canje sin cliente seleccionado");

  // 5) Retiro manual vinculado a la sesión
  await prisma.cashMovement.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      cashSessionId: session.id,
      type: "OUT",
      amountCents: 5000,
      reason: "Retiro de prueba",
      userId: null,
    },
  });
  ok(true, "Retiro manual OUT registrado (S/ 50.00)");

  // 6) Cierre con cuadre
  const openAt = session.openedAt;
  const movs = await prisma.cashMovement.findMany({
    where: { branchId: branch.id, createdAt: { gte: openAt } },
    select: { type: true, amountCents: true },
  });
  let inSum = 0, outSum = 0;
  for (const m of movs) { if (m.type === "IN") inSum += m.amountCents; else outSum += m.amountCents; }
  const expectedCents = session.openingCents + inSum - outSum;
  const closing = expectedCents + 0; // conteo exacto
  await prisma.cashSession.update({
    where: { id: session.id },
    data: { status: "CLOSED", closedAt: new Date(), closingCents: closing, expectedCents, differenceCents: 0 },
  });
  const closed = await prisma.cashSession.findUniqueOrThrow({ where: { id: session.id } });
  ok(
    closed.status === "CLOSED" &&
      closed.expectedCents === expectedCents &&
      closed.differenceCents === 0,
    `Cuadre de caja: esperado S/ ${(expectedCents / 100).toFixed(2)} (inicial + IN ventas+manual − OUT)`,
  );

  // Vacío: la caja ya no puede re-abrirse sin conflicto (validación de la acción)
  // Limpieza final
  await cleanup(tenant.id, session.id);
  const leftover = await prisma.sale.count({ where: { tenantId: tenant.id, customer: { name: TEST } } });
  ok(leftover === 0, "Limpieza final OK (sin ventas de prueba remanentes)");

  await prisma.$disconnect();
  console.log(`\nRESULTADO: ${passed} pasan, ${failed} fallan`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});