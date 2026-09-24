// Lógica de ventas, caja y comisiones (FASE 4, secciones 44-58).
// Las comisiones se calculan dentro de la misma transacción de venta para
// evitar inconsistencias (casos G/H de la seccion 91).

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const PAYMENT_METHODS = [
  "EFECTIVO",
  "TARJETA",
  "YAPE",
  "PLIN",
  "OTRO",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface SaleItemInput {
  kind: "SERVICE" | "PRODUCT";
  serviceId?: string;
  productId?: string;
  name?: string;
  qty: number;
  unitPriceCents: number;
  barberId?: string;
}

export interface CreateSaleInput {
  tenantId: string;
  branchId: string;
  customerId?: string;
  appointmentId?: string;
  items: SaleItemInput[];
  discountCents: number;
  paymentMethod: PaymentMethod;
  soldByUserId?: string;
  redeemPoints?: number;
}

export type SaleResult =
  | { ok: true; saleId: string }
  | { ok: false; error: string };

/**
 * Crea una venta. Las comisiones de barbero se calculan con:
 * BarberService.commissionPctOverride ?? Service.commissionPctDefault.
 * Registra movimiento de caja si el pago es EFECTIVO.
 */
export async function createSale(
  input: CreateSaleInput,
): Promise<SaleResult> {
  if (input.items.length === 0) {
    return { ok: false, error: "Agrega al menos un ítem." };
  }
  if (input.discountCents < 0 || input.discountCents > 0.5 * subtotal(input.items)) {
    return { ok: false, error: "Descuento inválido." };
  }
  if (input.redeemPoints && input.redeemPoints < 0) {
    return { ok: false, error: "Puntos inválidos." };
  }

  const subtotalCents = subtotal(input.items);

  // Fidelización (FASE 6): configuración de puntos del tenant
  const tenantCfg = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { pointsPerSol: true, pointRedeemCents: true },
  });
  const pointsPerSol = tenantCfg?.pointsPerSol ?? 10;
  const pointRedeemCents = tenantCfg?.pointRedeemCents ?? 10;

  let redeemCents = 0;
  if (input.redeemPoints && input.redeemPoints > 0) {
    if (!input.customerId) {
      return { ok: false, error: "Selecciona un cliente para canjear puntos." };
    }
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, tenantId: input.tenantId },
      select: { loyaltyPoints: true },
    });
    if (!customer) return { ok: false, error: "Cliente no encontrado." };
    if (customer.loyaltyPoints < input.redeemPoints) {
      return { ok: false, error: "El cliente no tiene suficientes puntos." };
    }
    redeemCents = input.redeemPoints * pointRedeemCents;
  }

  const totalCents = Math.max(
    0,
    subtotalCents - input.discountCents - redeemCents,
  );
  const earnedPoints = Math.floor(subtotalCents / pointsPerSol);

  // Resolver comisiones de servicios en bloque
  const serviceIds = input.items
    .filter((i) => i.kind === "SERVICE" && i.serviceId)
    .map((i) => i.serviceId!) as string[];
  const barberIds = input.items
    .map((i) => i.barberId)
    .filter((b): b is string => Boolean(b));

  const [services, overrides, activeBarbers] = await Promise.all([
    prisma.service.findMany({
      where: { id: { in: serviceIds }, tenantId: input.tenantId, isActive: true },
      select: { id: true, commissionPctDefault: true },
    }),
    prisma.barberService.findMany({
      where: { serviceId: { in: serviceIds }, barberId: { in: barberIds } },
      select: { serviceId: true, barberId: true, commissionPctOverride: true },
    }),
    prisma.barber.findMany({
      where: { id: { in: barberIds }, tenantId: input.tenantId },
      select: { id: true },
    }),
  ]);

  const serviceComm = new Map(services.map((s) => [s.id, s.commissionPctDefault]));
  const overrideKey = (barberId: string, serviceId: string) => `${barberId}:${serviceId}`;
  const overrideMap = new Map(
    overrides.map((o) => [overrideKey(o.barberId, o.serviceId), o.commissionPctOverride]),
  );
  const activeBarberSet = new Set(activeBarbers.map((b) => b.id));

  try {
    const saleId = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          tenantId: input.tenantId,
          branchId: input.branchId,
          customerId: input.customerId ?? null,
          appointmentId: input.appointmentId ?? null,
          status: "PAID",
          subtotalCents,
          discountCents: input.discountCents + redeemCents,
          totalCents,
          paymentMethod: input.paymentMethod,
          soldByUserId: input.soldByUserId ?? null,
          items: {
            create: input.items.map((item) => {
              let commissionPct = 0;
              let commissionCents = 0;
              if (item.kind === "SERVICE" && item.serviceId && item.barberId) {
                if (!activeBarberSet.has(item.barberId)) {
                  throw new Error("BARBER_INVALID");
                }
                const def = serviceComm.get(item.serviceId) ?? 0;
                const ovr =
                  overrideMap.get(overrideKey(item.barberId, item.serviceId)) ?? null;
                commissionPct = ovr ?? def;
                commissionCents = Math.round(
                  (item.unitPriceCents * item.qty * commissionPct) / 100,
                );
              }
              return {
                kind: item.kind,
                serviceId: item.serviceId ?? null,
                productId: item.productId ?? null,
                name: item.name ?? "",
                qty: item.qty,
                unitPriceCents: item.unitPriceCents,
                barberId: item.barberId ?? null,
                commissionPct,
                commissionCents,
              };
            }),
          },
        },
        select: { id: true },
      });

      // Productos: descontar stock
      for (const item of input.items) {
        if (item.kind !== "PRODUCT" || !item.productId) continue;
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId: input.tenantId },
          select: { id: true, stockQty: true },
        });
        if (!product) throw new Error("PRODUCT_INVALID");
        const newStock = product.stockQty - item.qty;
        if (newStock < 0) throw new Error("PRODUCT_STOCK");
        await tx.product.update({
          where: { id: product.id },
          data: { stockQty: newStock },
        });
        await tx.stockMovement.create({
          data: {
            tenantId: input.tenantId,
            branchId: input.branchId,
            productId: product.id,
            type: "SALE",
            qty: item.qty,
            stockAfter: newStock,
            reason: "Venta",
            userId: input.soldByUserId ?? null,
          },
        });
      }

      // Movimiento de caja por venta en efectivo
      if (input.paymentMethod === "EFECTIVO") {
        await tx.cashMovement.create({
          data: {
            tenantId: input.tenantId,
            branchId: input.branchId,
            saleId: sale.id,
            type: "IN",
            amountCents: totalCents,
            reason: "Venta",
            userId: input.soldByUserId ?? null,
          },
        });
      }

      // Fidelización: canje y acumulación de puntos del cliente
      if (input.customerId) {
        const deltas = {
          loyaltyPoints:
            (input.redeemPoints ?? 0) * -1 + earnedPoints,
        };
        if (deltas.loyaltyPoints !== 0) {
          await tx.customer.update({
            where: { id: input.customerId },
            data: { loyaltyPoints: { increment: deltas.loyaltyPoints } },
          });
        }
      }

      return sale.id;
    });

    return { ok: true, saleId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "BARBER_INVALID") {
      return { ok: false, error: "Barbero no válido para la venta." };
    }
    if (message === "PRODUCT_INVALID") {
      return { ok: false, error: "Producto no válido." };
    }
    if (message === "PRODUCT_STOCK") {
      return { ok: false, error: "Stock insuficiente para un producto." };
    }
    console.error("[createSale] Error:", error);
    return { ok: false, error: "No pudimos registrar la venta. Intenta nuevamente." };
  }
}

function subtotal(items: SaleItemInput[]): number {
  return items.reduce((acc, i) => acc + i.unitPriceCents * i.qty, 0);
}

/** Comisiones pendientes de pagar por barbero en un rango. */
export async function commissionsForRange(
  tenantId: string,
  from: Date,
  to: Date,
  barberId?: string,
) {
  const where: Prisma.SaleItemWhereInput = {
    barberId: barberId ? barberId : { not: null },
    sale: { tenantId, status: "PAID", createdAt: { gte: from, lt: to } },
  };
  const groups = await prisma.saleItem.groupBy({
    by: ["barberId"],
    where,
    _sum: { commissionCents: true, unitPriceCents: true },
  });
  const barberIds = groups.map((g) => g.barberId).filter((b): b is string => Boolean(b));
  const barbers = await prisma.barber.findMany({
    where: { id: { in: barberIds } },
    select: { id: true, displayName: true },
  });
  return groups.map((g) => ({
    barberId: g.barberId ?? null,
    barberName: barbers.find((b) => b.id === g.barberId)?.displayName ?? "—",
    commissionCents: g._sum.commissionCents ?? 0,
    baseCents: g._sum.unitPriceCents ?? 0,
  }));
}

/** Venta total del día (para caja) en centimos. */
export async function daySalesTotal(
  tenantId: string,
  branchId: string,
  range: { start: Date; end: Date },
): Promise<number> {
  const agg = await prisma.sale.aggregate({
    where: {
      tenantId,
      branchId,
      status: "PAID",
      createdAt: { gte: range.start, lt: range.end },
    },
    _sum: { totalCents: true },
  });
  return agg._sum.totalCents ?? 0;
}