// Seed DEMO — BARBEROS
// Datos de demostración claramente marcados [DEMO] (secciones 101, 110).
// Idempotente: reemplaza el tenant demo existente.
//
// Uso: npm run db:seed

import "dotenv/config";
import { createPrismaAdapter } from "../src/lib/db-adapters";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { addDaysToKey, limaToUTC, parseDateKey } from "../src/lib/scheduling/time";

const prisma = new PrismaClient({ adapter: createPrismaAdapter(process.env.DATABASE_URL!) });

const SLUG = "demo-barberia-central";
const OWNER_EMAIL = "demo@barberos.pe";
const OWNER_PASSWORD = "demo1234";

function dayAt(dateKey: string, hhmm: string): Date {
  const d = parseDateKey(dateKey)!;
  const [h, m] = hhmm.split(":").map(Number);
  return limaToUTC(d.y, d.m, d.d, h * 60 + m);
}

async function main() {
  console.log("▶ Sembrando datos [DEMO]…");

  // Reemplazo limpio del tenant demo (orden seguro por FK)
  const existingTenantId = await prisma.tenant.findUnique({
    where: { slug: SLUG },
    select: { id: true },
  });
  const existingId = existingTenantId?.id ?? null;
  if (existingId) {
    await prisma.saleItem.deleteMany({ where: { sale: { tenantId: existingId } } });
    await prisma.sale.deleteMany({ where: { tenantId: existingId } });
    await prisma.cashMovement.deleteMany({ where: { tenantId: existingId } });
    await prisma.cashSession.deleteMany({ where: { tenantId: existingId } });
    await prisma.stockMovement.deleteMany({ where: { tenantId: existingId } });
    await prisma.product.deleteMany({ where: { tenantId: existingId } });
    await prisma.productCategory.deleteMany({ where: { tenantId: existingId } });
    await prisma.supplier.deleteMany({ where: { tenantId: existingId } });
    await prisma.promotion.deleteMany({ where: { tenantId: existingId } });
    await prisma.appointment.deleteMany({ where: { tenantId: existingId } });
    await prisma.customer.deleteMany({ where: { tenantId: existingId } });
    await prisma.barber.deleteMany({ where: { tenantId: existingId } });
    await prisma.branch.deleteMany({ where: { tenantId: existingId } });
    await prisma.service.deleteMany({ where: { tenantId: existingId } });
    await prisma.serviceCategory.deleteMany({ where: { tenantId: existingId } });
    await prisma.timeOff.deleteMany({ where: { tenantId: existingId } });
    await prisma.user.deleteMany({ where: { tenantId: existingId } });
    await prisma.auditLog.deleteMany({ where: { tenantId: existingId } });
    await prisma.tenant.deleteMany({ where: { slug: SLUG } });
  }

  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 12);

  const tenant = await prisma.tenant.create({
    data: {
      name: "[DEMO] Barbería Central",
      slug: SLUG,
      status: "TRIAL",
      trialEndsAt: new Date(Date.now() + 14 * 86400000),
      users: {
        create: {
          email: OWNER_EMAIL,
          name: "[DEMO] Dueño Demo",
          passwordHash,
          role: "OWNER",
        },
      },
    },
  });
  const owner = await prisma.user.findFirst({
    where: { tenantId: tenant.id },
    select: { id: true },
  });

  // --- Sede + horario
  const branch = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: "[DEMO] Miraflores",
      address: "Av. Arequipa 1234",
      phone: "987000111",
    },
  });
  await prisma.branchSchedule.createMany({
    data: Array.from({ length: 7 }, (_, weekday) => ({
      branchId: branch.id,
      weekday,
      isClosed: weekday === 0,
      openMin: 9 * 60,
      closeMin: 19 * 60,
    })),
  });

  // --- Categorías y servicios
  const corte = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      name: "Corte clásico",
      priceCents: 4000,
      durationMin: 30,
      description: "Corte a máquina y tijera según tu estilo.",
    },
  });
  const corteBarba = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      name: "Corte + barba",
      priceCents: 6500,
      durationMin: 60,
      description: "El combo completo.",
    },
  });
  const barba = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      name: "Arreglo de barba",
      priceCents: 2500,
      durationMin: 20,
    },
  });
  const diseno = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      name: "Diseño / freestyle",
      priceCents: 5000,
      durationMin: 45,
    },
  });

  for (const s of [corte, corteBarba, barba, diseno]) {
    await prisma.serviceBranch.create({
      data: { serviceId: s.id, branchId: branch.id },
    });
  }

  // --- Barberos con cuentas de acceso
  const barberData = [
    { displayName: "Carlos", email: "carlos@demo.pe", weekdaysOff: [0] },
    { displayName: "Miguel", email: "miguel@demo.pe", weekdaysOff: [0] },
    { displayName: "Luis", email: "luis@demo.pe", weekdaysOff: [1] }, // descansa lunes
  ];
  const barbers: { id: string }[] = [];
  for (const b of barberData) {
    const barber = await prisma.barber.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        userId: (
          await prisma.user.create({
            data: {
              tenantId: tenant.id,
              email: b.email,
              name: `[DEMO] ${b.displayName}`,
              passwordHash,
              role: "BARBER",
            },
            select: { id: true },
          })
        ).id,
        displayName: b.displayName,
        specialties: b.displayName === "Carlos" ? "Fades y diseños" : null,
      },
    });
    await prisma.barberSchedule.createMany({
      data: Array.from({ length: 7 }, (_, weekday) => ({
        barberId: barber.id,
        weekday: weekday === 0 ? weekday : weekday, // se filtra abajo
        startMin: 10 * 60,
        endMin: 19 * 60,
      })).filter((r) => !b.weekdaysOff.includes(r.weekday)),
    });
    const assigned = [corte, corteBarba, barba];
    if (b.displayName === "Carlos") assigned.push(diseno);
    await prisma.barberService.createMany({
      data: assigned.map((s) => ({ barberId: barber.id, serviceId: s.id })),
    });
    barbers.push(barber);
  }

  // --- Clientes
  const customerNames = [
    ["Juan Pérez", "987111222"],
    ["Pedro Torres", "987333444"],
    ["Diego Ramos", "987555666"],
    ["Andrés Silva", "987777888"],
    ["Marco Quispe", "987999000"],
  ] as const;
  const customers: { id: string }[] = [];
  for (let i = 0; i < customerNames.length; i++) {
    const [name, phone] = customerNames[i];
    customers.push(
      await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          name,
          phone,
          source: i % 2 === 0 ? "ONLINE" : "MANUAL",
          // Preferencia de barbero (rotativa)
          preferredBarberId: barbers[i % barbers.length].id,
          ...(i === 0 && {
            email: "juan.perez@demo.pe",
            birthDate: new Date("1992-04-11T12:00:00Z"),
            notes: "[DEMO] Cliente frecuente, prefiere fades.",
          }),
        },
      }),
    );
  }

  // Notas CRM [DEMO]
  await prisma.customerNote.createMany({
    data: [
      {
        customerId: customers[0].id,
        body: "[DEMO] Prefiere reservar los martes por la mañana.",
      },
      {
        customerId: customers[2].id,
        body: "[DEMO] Mencionó que pronto viene con su hermano.",
      },
    ],
  });

  // --- FASE 6: puntos de fidelidad y promoción demo
  const existingPromos = await prisma.promotion.count({
    where: { tenantId: tenant.id },
  });
  if (existingPromos === 0) {
    // Puntos iniciales demo
    for (let i = 0; i < customers.length; i++) {
      await prisma.customer.update({
        where: { id: customers[i].id },
        data: { loyaltyPoints: (i + 2) * 50 },
      });
    }
    await prisma.promotion.create({
      data: {
        tenantId: tenant.id,
        name: "Martes de cortes 20%",
        description: "[DEMO] Descuento en cortes clásicos los martes.",
        discountPct: 20,
        isActive: true,
      },
    });
  }

  // --- Reservas demo (mañana y ayer para variedad de estados)
  const tomorrow = addDaysToKey(new Date().toISOString().slice(0, 10), 1);
  const yesterday = addDaysToKey(new Date().toISOString().slice(0, 10), -1);

  async function book(
    barberIdx: number,
    customerIdx: number,
    dateKey: string,
    hhmm: string,
    service: typeof corte,
    status?: string,
  ) {
    const appt = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        barberId: barbers[barberIdx].id,
        customerId: customers[customerIdx].id,
        status: status ?? "CONFIRMED",
        source: "ONLINE",
        startsAt: dayAt(dateKey, hhmm),
        endsAt: new Date(dayAt(dateKey, hhmm).getTime() + service.durationMin * 60000),
        priceCents: service.priceCents,
        ...(status === "COMPLETED" && { completedAt: dayAt(dateKey, hhmm) }),
        ...(status === "NO_SHOW" && { noShowAt: dayAt(dateKey, hhmm) }),
        services: {
          create: {
            serviceId: service.id,
            serviceName: service.name,
            durationMin: service.durationMin,
            priceCents: service.priceCents,
          },
        },
      },
    });
    return appt;
  }

  await book(0, 0, tomorrow, "10:00", corte);
  await book(0, 1, tomorrow, "11:00", corteBarba);
  await book(1, 2, tomorrow, "10:00", corte);
  await book(2, 3, tomorrow, "12:00", barba);
  await book(1, 4, tomorrow, "15:00", corteBarba);
  await book(0, 2, yesterday, "10:00", corte, "COMPLETED");
  await book(1, 3, yesterday, "11:00", corte, "NO_SHOW");

  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: owner?.id,
        action: "TENANT_CREATED",
        entity: "Tenant",
        entityId: tenant.id,
        metadata: JSON.stringify({ demo: true }),
      },
    ],
  });

  // --- FASE 5: productos, categorías, proveedores y stock demo
  const existingProducts = await prisma.product.count({
    where: { tenantId: tenant.id },
  });
  if (existingProducts === 0) {
    const catCapilar = await prisma.productCategory.create({
      data: { tenantId: tenant.id, name: "Capilares" },
    });
    const catBelleza = await prisma.productCategory.create({
      data: { tenantId: tenant.id, name: "Belleza y cuidado" },
    });
    await prisma.supplier.create({
      data: {
        tenantId: tenant.id,
        name: "Distribuidora Lima SAC",
        phone: "987111000",
        email: "ventas@lima.prove.pe",
      },
    });
    const productSeed = [
      { name: "Gel fijador 250ml", priceCents: 4500, stockQty: 12, minStockQty: 5, catIds: [catCapilar.id] },
      { name: "Pomada matizadora 100g", priceCents: 3900, stockQty: 2, minStockQty: 4, catIds: [catCapilar.id] },
      { name: "Shampoo profesional 1L", priceCents: 6800, stockQty: 8, minStockQty: 3, catIds: [catCapilar.id] },
      { name: "Aceite para barba 50ml", priceCents: 5500, stockQty: 0, minStockQty: 3, catIds: [catBelleza.id] },
    ];
    for (const p of productSeed) {
      const product = await prisma.product.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          categoryId: p.catIds[0],
          name: p.name,
          priceCents: p.priceCents,
          costCents: Math.round(p.priceCents * 0.5),
          stockQty: p.stockQty,
          minStockQty: p.minStockQty,
        },
        select: { id: true },
      });
      await prisma.stockMovement.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          productId: product.id,
          type: "PURCHASE",
          qty: p.stockQty,
          stockAfter: p.stockQty,
          reason: "[DEMO] Compra inicial",
        },
      });
    }
  }

  // --- FASE 4: ventas, caja y comisiones demo
  const completeCashSessions = await prisma.cashSession.findMany({
    where: { tenantId: tenant.id },
    select: { id: true },
  });
  if (completeCashSessions.length === 0) {
    // Caja abierta hoy (demo)
    const openSession = await prisma.cashSession.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        openedById: owner?.id ?? "",
        openingCents: 20000,
        expectedCents: 20000,
        status: "OPEN",
      },
    });

    // Venta walk-in de hoy (EFECTIVO → genera ingreso de caja + comisión)
    const { createSale } = await import("../src/lib/sales");
    await createSale({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customers[1].id,
      paymentMethod: "EFECTIVO",
      discountCents: 0,
      soldByUserId: owner?.id,
      items: [
        {
          kind: "SERVICE",
          serviceId: corte.id,
          name: corte.name,
          qty: 1,
          unitPriceCents: corte.priceCents,
          barberId: barbers[0].id,
        },
        {
          kind: "SERVICE",
          serviceId: barba.id,
          name: barba.name,
          qty: 1,
          unitPriceCents: barba.priceCents,
          barberId: barbers[0].id,
        },
      ],
    });

    // Venta ligada a la cita completada de ayer (comisión para Carlos)
    const yesterdayAppt = await prisma.appointment.findFirst({
      where: { tenantId: tenant.id, status: "COMPLETED", startsAt: { gte: dayAt(yesterday, "00:00") } },
      orderBy: { startsAt: "asc" },
      select: { id: true, customerId: true, barberId: true },
    });
    if (yesterdayAppt) {
      await createSale({
        tenantId: tenant.id,
        branchId: branch.id,
        appointmentId: yesterdayAppt.id,
        customerId: yesterdayAppt.customerId,
        paymentMethod: "YAPE",
        discountCents: 0,
        soldByUserId: owner?.id,
        items: [
          {
            kind: "SERVICE",
            serviceId: corte.id,
            name: corte.name,
            qty: 1,
            unitPriceCents: corte.priceCents,
            barberId: barbers[0].id,
          },
        ],
      });
    }

    // Movimiento OUT manual (gasto)
    await prisma.cashMovement.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        cashSessionId: openSession.id,
        type: "OUT",
        amountCents: 3500,
        reason: "[DEMO] Compra de café y snacks",
        userId: owner?.id,
      },
    });

    // Sesión cerrada de ayer (cuadrada)
    await prisma.cashSession.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        openedById: owner?.id ?? "",
        openingCents: 10000,
        expectedCents: 10000,
        closingCents: 10000,
        differenceCents: 0,
        status: "CLOSED",
        openedAt: dayAt(yesterday, "09:00"),
        closedAt: dayAt(yesterday, "19:00"),
      },
    });
  }

  console.log("✓ Tenant:", tenant.name);
  console.log(`✓ Login dueño: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  console.log("✓ Barberos: carlos@demo.pe · miguel@demo.pe · luis@demo.pe (pass = demo1234)");
  console.log("✓ Reserva pública: /reservar/demo-barberia-central");
}

main()
  .catch((e) => {
    console.error("✗ Error en seed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
