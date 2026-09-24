"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export interface CashFormState {
  error?: string;
  success?: boolean;
}

/** Abre caja en la sucursal indicada (solo una abierta por sede). */
export async function openCashSessionAction(
  _prev: CashFormState,
  formData: FormData,
): Promise<CashFormState> {
  const auth = await requireTenant();

  const branchId = String(formData.get("branchId") ?? "");
  const opening = String(formData.get("opening") ?? "").trim();
  if (!branchId) return { error: "Selecciona la sede." };
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId: auth.tenant.id },
    select: { id: true },
  });
  if (!branch) return { error: "Sede no encontrada." };
  const openingCents = parseCents(opening);
  if (openingCents === null) return { error: "Importe inicial inválido (ej. 200.00)." };

  const open = await prisma.cashSession.findFirst({
    where: { tenantId: auth.tenant.id, branchId, status: "OPEN" },
    select: { id: true },
  });
  if (open) return { error: "Ya hay una caja abierta en esta sede." };

  await prisma.cashSession.create({
    data: {
      tenantId: auth.tenant.id,
      branchId,
      openedById: auth.user.id,
      openingCents,
      expectedCents: openingCents,
      status: "OPEN",
    },
  });

  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: "CASH_OPENED",
    entity: "CashSession",
    entityId: branchId,
  });
  revalidatePath("/caja");
  return { success: true };
}

/** Cierre de caja: verifica el conteo real vs. lo esperado. */
export async function closeCashSessionAction(
  _prev: CashFormState,
  formData: FormData,
): Promise<CashFormState> {
  const auth = await requireTenant();

  const sessionId = String(formData.get("sessionId") ?? "");
  const closing = String(formData.get("closing") ?? "").trim();
  const closingCents = parseCents(closing);
  if (closingCents === null) return { error: "Conteo final inválido (ej. 500.00)." };

  const session = await prisma.cashSession.findFirst({
    where: { id: sessionId, tenantId: auth.tenant.id, status: "OPEN" },
    select: { id: true, openingCents: true, branchId: true, openedAt: true },
  });
  if (!session) return { error: "Caja no encontrada o ya cerrada." };

  // Esperado = inicial + ingresos(IN) - salidas(OUT) desde la apertura de esta sesión.
  // Incluye movimientos generados por ventas en efectivo (IN sin cashSessionId)
  // y los manuales de la sede; así el cuadre coincide con lo vendido en la caja.
  const { inSum, outSum } = await classifyMovementsByBranch(
    auth.tenant.id,
    session.branchId,
    session.openedAt,
  );
  const expectedCents = session.openingCents + inSum - outSum;
  const differenceCents = closingCents - expectedCents;

  await prisma.cashSession.update({
    where: { id: session.id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closingCents,
      expectedCents,
      differenceCents,
    },
  });

  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: "CASH_CLOSED",
    entity: "CashSession",
    entityId: session.id,
    metadata: { expectedCents, closingCents, differenceCents },
  });
  revalidatePath("/caja");
  return { success: true };
}

/** Registra movimiento: IN (ingreso) / OUT (retiro o gasto). */
export async function registerMovementAction(
  _prev: CashFormState,
  formData: FormData,
): Promise<CashFormState> {
  const auth = await requireTenant();

  const branchId = String(formData.get("branchId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const type = String(formData.get("type") ?? "");
  const amount = String(formData.get("amount") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId: auth.tenant.id },
    select: { id: true },
  });
  if (!branch) return { error: "Sede no encontrada." };

  const amountCents = parseCents(amount);
  if (!["IN", "OUT"].includes(type)) return { error: "Tipo inválido." };
  if (amountCents === null || amountCents <= 0) return { error: "Monto inválido." };
  if (sessionId) {
    const s = await prisma.cashSession.findFirst({
      where: { id: sessionId, tenantId: auth.tenant.id, status: "OPEN" },
      select: { id: true },
    });
    if (!s) return { error: "Caja no abierta." };
  }

  await prisma.cashMovement.create({
    data: {
      tenantId: auth.tenant.id,
      branchId,
      cashSessionId: sessionId || null,
      type,
      amountCents,
      reason: reason.slice(0, 200),
      userId: auth.user.id,
    },
  });

  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: type === "IN" ? "CASH_MOVEMENT_IN" : "CASH_MOVEMENT_OUT",
    entity: "CashMovement",
    entityId: branchId,
  });
  revalidatePath("/caja");
  return { success: true };
}

function parseCents(value: string): number | null {
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(value)) return null;
  return Math.round(parseFloat(value) * 100);
}

async function classifyMovementsByBranch(tenantId: string, branchId: string, from: Date) {
  const movements = await prisma.cashMovement.findMany({
    where: { tenantId, branchId, createdAt: { gte: from } },
    select: { type: true, amountCents: true },
  });
  let inSum = 0;
  let outSum = 0;
  for (const m of movements) {
    if (m.type === "IN") inSum += m.amountCents;
    else outSum += m.amountCents;
  }
  return { inSum, outSum };
}