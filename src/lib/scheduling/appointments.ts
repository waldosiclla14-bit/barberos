// Creación y transiciones de citas con validación backend estricta.
// Protección anti-double-booking: el chequeo de conflicto ocurre DENTRO de la
// transacción (secciones 15, 72, 91-Caso A).

import { prisma } from "@/lib/prisma";
import { limaToUTC, overlaps, toLimaParts } from "@/lib/scheduling/time";
import { createSale } from "@/lib/sales";
import type { Prisma } from "@/generated/prisma/client";

const BUSY_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_SERVICE"];

export interface CreateAppointmentInput {
  tenantId: string;
  branchId: string;
  barberId: string;
  serviceIds: string[];
  startsAt: Date;
  customer: {
    id?: string;
    name?: string;
    phone?: string;
  };
  source?: "ONLINE" | "WALK_IN" | "INTERNAL";
  notes?: string;
}

export type CreateAppointmentResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: string };

async function findConflict(
  tx: Prisma.TransactionClient,
  barberId: string,
  branchId: string,
  startsAt: Date,
  endsAt: Date,
) {
  const conflict = await tx.appointment.findFirst({
    where: {
      barberId,
      status: { in: BUSY_STATUSES },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });
  if (conflict) return true;

  // Bloqueo del propio barbero
  const barberTimeOff = await tx.timeOff.findFirst({
    where: {
      barberId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });
  if (barberTimeOff) return true;

  // Bloqueo de toda la sede (barberId null)
  const branchBlock = await tx.timeOff.findFirst({
    where: {
      barberId: null,
      OR: [{ branchId }, { branchId: null }],
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });
  return Boolean(branchBlock);
}

/** Crea una cita validando disponibilidad real dentro de la transacción. */
export async function createAppointmentSafe(
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  if (!Array.isArray(input.serviceIds) || input.serviceIds.length === 0) {
    return { ok: false, error: "Selecciona al menos un servicio." };
  }

  // Sede debe pertenecer al tenant y estar activa; el barbero debe ser de esa
  // sede y ofrecer los servicios (evita citas cross-tenant / sede inactiva).
  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, tenantId: input.tenantId, isActive: true },
    select: { id: true },
  });
  if (!branch) {
    return { ok: false, error: "La sede no está disponible." };
  }

  const services = await prisma.service.findMany({
    where: {
      tenantId: input.tenantId,
      id: { in: input.serviceIds },
      isActive: true,
    },
    select: { id: true, name: true, durationMin: true, priceCents: true },
  });
  if (services.length !== input.serviceIds.length) {
    return { ok: false, error: "Servicio no disponible." };
  }

  const barber = await prisma.barber.findFirst({
    where: {
      tenantId: input.tenantId,
      branchId: input.branchId,
      id: input.barberId,
      isActive: true,
      AND: input.serviceIds.map((sid) => ({
        services: { some: { serviceId: sid } },
      })),
    },
    select: { id: true },
  });
  if (!barber) {
    return { ok: false, error: "El barbero no ofrece esos servicios." };
  }

  // Horario del día: la sede y el barbero deben atender el día y cubrir la
  // ventana completa de la cita (misma lógica que el motor de disponibilidad).
  const parts = toLimaParts(input.startsAt);
  const { weekday } = parts;
  const [branchDay, barberDay] = await Promise.all([
    prisma.branchSchedule.findFirst({
      where: { branchId: input.branchId, weekday },
      select: { isClosed: true, openMin: true, closeMin: true },
    }),
    prisma.barberSchedule.findFirst({
      where: { barberId: input.barberId, weekday },
      select: { startMin: true, endMin: true },
    }),
  ]);
  if (branchDay?.isClosed || !barberDay) {
    return { ok: false, error: "La sede no atiende ese día." };
  }
  const totalDurationMin = services.reduce((a, s) => a + s.durationMin, 0);
  const totalPriceCents = services.reduce((a, s) => a + s.priceCents, 0);
  const endsAt = new Date(input.startsAt.getTime() + totalDurationMin * 60 * 1000);
  if (input.startsAt < new Date()) {
    return { ok: false, error: "No puedes reservar en el pasado." };
  }
  if (endsAt <= new Date()) {
    return { ok: false, error: "La reserva ya terminó." };
  }
  const dayStartMin = Math.max(branchDay?.openMin ?? 0, barberDay.startMin);
  const dayEndMin = Math.min(
    branchDay?.closeMin ?? 24 * 60,
    barberDay.endMin,
  );
  const dayStart = limaToUTC(parts.year, parts.month, parts.day, dayStartMin);
  const dayEnd = limaToUTC(parts.year, parts.month, parts.day, dayEndMin);
  if (input.startsAt < dayStart || endsAt > dayEnd) {
    return { ok: false, error: "La sede no atiende en ese horario." };
  }

  // Si llega un customer.id, debe pertenecer al tenant (evita IDOR
  // cross-tenant: notas/visitas/puntos a clientes de otra barbería).
  if (input.customer.id) {
    const owner = await prisma.customer.findFirst({
      where: { id: input.customer.id, tenantId: input.tenantId },
      select: { id: true },
    });
    if (!owner) {
      return { ok: false, error: "Cliente no válido." };
    }
  }

  try {
    const appointmentId = await prisma.$transaction(async (tx) => {
      const hasConflict = await findConflict(
        tx,
        input.barberId,
        input.branchId,
        input.startsAt,
        endsAt,
      );
      if (hasConflict) throw new Error("SLOT_TAKEN");

      // Cliente: existente por id o por teléfono; si no, crearlo
      let customerId = input.customer.id ?? null;
      if (!customerId && input.customer.phone && input.customer.name) {
        const existing = await tx.customer.findUnique({
          where: {
            tenantId_phone: { tenantId: input.tenantId, phone: input.customer.phone },
          },
          select: { id: true },
        });
        customerId =
          existing?.id ??
          (
            await tx.customer.create({
              data: {
                tenantId: input.tenantId,
                name: input.customer.name.trim().slice(0, 80),
                phone: input.customer.phone.trim(),
              },
              select: { id: true },
            })
          ).id;
      }
      if (!customerId) throw new Error("CUSTOMER_REQUIRED");

      const created = await tx.appointment.create({
        data: {
          tenantId: input.tenantId,
          branchId: input.branchId,
          barberId: input.barberId,
          customerId,
          status: "CONFIRMED",
          source: input.source ?? "ONLINE",
          startsAt: input.startsAt,
          endsAt,
          priceCents: totalPriceCents,
          notes: input.notes?.slice(0, 500),
          services: {
            create: services.map((s) => ({
              serviceId: s.id,
              serviceName: s.name,
              durationMin: s.durationMin,
              priceCents: s.priceCents,
            })),
          },
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          action: "APPOINTMENT_CREATED",
          entity: "Appointment",
          entityId: created.id,
          metadata: JSON.stringify({
            startsAt: input.startsAt.toISOString(),
            barberId: input.barberId,
            source: input.source ?? "ONLINE",
          }),
        },
      });

      return created.id;
    });

    return { ok: true, appointmentId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "SLOT_TAKEN") {
      return { ok: false, error: "Ese horario acaba de ocuparse. Elige otro." };
    }
    if (message === "CUSTOMER_REQUIRED") {
      return { ok: false, error: "Faltan datos del cliente." };
    }
    console.error("[createAppointment] Error:", error);
    return { ok: false, error: "No pudimos crear la reserva. Intenta nuevamente." };
  }
}

/**
 * Crea la venta asociada a una cita completada (FASE 4, caso G).
 * No lanza: si falla la venta, la cita ya quedó completada y se loguea.
 */
async function createSaleFromAppointment(tenantId: string, appointmentId: string) {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        customerId: true,
        barberId: true,
        priceCents: true,
        services: {
          select: { serviceId: true, serviceName: true, priceCents: true },
        },
      },
    });
    if (!appt || appt.tenantId !== tenantId) return;
    const already = await prisma.sale.findUnique({
      where: { appointmentId },
      select: { id: true },
    });
    if (already) return;

    await createSale({
      tenantId,
      branchId: appt.branchId,
      customerId: appt.customerId,
      appointmentId: appt.id,
      paymentMethod: "EFECTIVO",
      discountCents: 0,
      soldByUserId: undefined,
      items: appt.services.map((s) => ({
        kind: "SERVICE" as const,
        serviceId: s.serviceId,
        name: s.serviceName,
        qty: 1,
        unitPriceCents: s.priceCents,
        barberId: appt.barberId,
      })),
    });
  } catch (error) {
    console.error("[createSaleFromAppointment]", error);
  }
}

export type Transition =
  | "CHECK_IN"
  | "START_SERVICE"
  | "COMPLETE_SERVICE"
  | "CANCEL"
  | "NO_SHOW"
  | "RECONFIRM";

const ALLOWED: Record<Transition, string[]> = {
  RECONFIRM: ["PENDING"],
  CHECK_IN: ["PENDING", "CONFIRMED"],
  START_SERVICE: ["CHECKED_IN"],
  COMPLETE_SERVICE: ["IN_SERVICE"],
  CANCEL: ["PENDING", "CONFIRMED", "CHECKED_IN"],
  NO_SHOW: ["PENDING", "CONFIRMED", "CHECKED_IN"],
};

const TARGET_STATUS: Record<Transition, string> = {
  RECONFIRM: "CONFIRMED",
  CHECK_IN: "CHECKED_IN",
  START_SERVICE: "IN_SERVICE",
  COMPLETE_SERVICE: "COMPLETED",
  CANCEL: "CANCELLED",
  NO_SHOW: "NO_SHOW",
};

/** Transición de estado con reglas de máquina de estados (seccion 19). */
export async function transitionAppointment(
  tenantId: string,
  appointmentId: string,
  transition: Transition,
  opts?: { userId?: string | null; cancelReason?: string },
): Promise<CreateAppointmentResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findFirst({
        where: { id: appointmentId, tenantId },
        select: {
          id: true,
          status: true,
          customerId: true,
          startsAt: true,
        },
      });
      if (!appt) throw new Error("NOT_FOUND");

      if (!ALLOWED[transition].includes(appt.status)) {
        throw new Error("INVALID_TRANSITION");
      }

      const now = new Date();
      await tx.appointment.update({
        where: { id: appt.id },
        data: {
          status: TARGET_STATUS[transition],
          ...(transition === "CHECK_IN" && { checkedInAt: now }),
          ...(transition === "START_SERVICE" && { startedAt: now }),
          ...(transition === "COMPLETE_SERVICE" && { completedAt: now }),
          ...(transition === "CANCEL" && {
            cancelledAt: now,
            cancelReason: opts?.cancelReason?.slice(0, 300),
          }),
          ...(transition === "NO_SHOW" && { noShowAt: now }),
        },
      });

      // CRM (FASE 3): al completar, actualiza conteo de visitas del cliente
      if (transition === "COMPLETE_SERVICE" && appt.customerId) {
        await tx.customer.update({
          where: { id: appt.customerId },
          data: {
            visitCount: { increment: 1 },
            lastVisitAt: appt.startsAt,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: opts?.userId ?? null,
          action: `APPOINTMENT_${transition}`,
          entity: "Appointment",
          entityId: appt.id,
        },
      });
    });

    // FASE 4 (caso G): al completar el servicio se genera la venta con
    // las comisiones de barbero calculadas al momento.
    if (transition === "COMPLETE_SERVICE") {
      await createSaleFromAppointment(tenantId, appointmentId);
    }

    return { ok: true, appointmentId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_FOUND") {
      return { ok: false, error: "Reserva no encontrada." };
    }
    if (message === "INVALID_TRANSITION") {
      return { ok: false, error: "Esa acción no es válida para el estado actual." };
    }
    console.error("[transitionAppointment] Error:", error);
    return { ok: false, error: "No pudimos actualizar la reserva. Intenta nuevamente." };
  }
}

/** Reprogramación con verificación de conflicto excluyendo la propia cita. */
export async function rescheduleAppointment(
  tenantId: string,
  appointmentId: string,
  newStartsAt: Date,
  opts?: { userId?: string | null },
): Promise<CreateAppointmentResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findFirst({
        where: { id: appointmentId, tenantId },
        select: {
          id: true,
          status: true,
          endsAt: true,
          startsAt: true,
          barberId: true,
          branchId: true,
        },
      });
      if (!appt) throw new Error("NOT_FOUND");
      if (!["PENDING", "CONFIRMED"].includes(appt.status)) {
        throw new Error("INVALID_TRANSITION");
      }

      const durationMs = appt.endsAt.getTime() - appt.startsAt.getTime();
      const newEndsAt = new Date(newStartsAt.getTime() + durationMs);

      const conflict = await tx.appointment.findFirst({
        where: {
          barberId: appt.barberId,
          status: { in: BUSY_STATUSES },
          id: { not: appt.id },
          startsAt: { lt: newEndsAt },
          endsAt: { gt: newStartsAt },
        },
        select: { id: true },
      });
      if (conflict) throw new Error("SLOT_TAKEN");

      if (newStartsAt < new Date()) {
        throw new Error("INVALID_TIME");
      }

      const parts = toLimaParts(newStartsAt);
      const { weekday } = parts;
      const [branchDay, barberDay] = await Promise.all([
        tx.branchSchedule.findFirst({
          where: { branchId: appt.branchId, weekday },
          select: { isClosed: true, openMin: true, closeMin: true },
        }),
        tx.barberSchedule.findFirst({
          where: { barberId: appt.barberId, weekday },
          select: { startMin: true, endMin: true },
        }),
      ]);
      if (branchDay?.isClosed || !barberDay) {
        throw new Error("CLOSED_DAY");
      }
      const startMin = Math.max(branchDay?.openMin ?? 0, barberDay.startMin);
      const endMin = Math.min(
        branchDay?.closeMin ?? 24 * 60,
        barberDay.endMin,
      );
      const dayStart = limaToUTC(parts.year, parts.month, parts.day, startMin);
      const dayEnd = limaToUTC(parts.year, parts.month, parts.day, endMin);
      if (newStartsAt < dayStart || newEndsAt > dayEnd) {
        throw new Error("CLOSED_DAY");
      }

      await tx.appointment.update({
        where: { id: appt.id },
        data: { startsAt: newStartsAt, endsAt: newEndsAt },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: opts?.userId ?? null,
          action: "APPOINTMENT_RESCHEDULED",
          entity: "Appointment",
          entityId: appt.id,
          metadata: JSON.stringify({ newStartsAt: newStartsAt.toISOString() }),
        },
      });
    });
    return { ok: true, appointmentId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "SLOT_TAKEN") {
      return { ok: false, error: "Ese horario está ocupado. Elige otro." };
    }
    if (message === "INVALID_TIME") {
      return { ok: false, error: "No puedes reprogramar en el pasado." };
    }
    if (message === "CLOSED_DAY") {
      return { ok: false, error: "La sede no atiende en ese horario." };
    }
    if (message === "NOT_FOUND") return { ok: false, error: "Reserva no encontrada." };
    if (message === "INVALID_TRANSITION") {
      return { ok: false, error: "Solo se pueden reprogramar reservas pendientes o confirmadas." };
    }
    console.error("[rescheduleAppointment] Error:", error);
    return { ok: false, error: "No pudimos reprogramar. Intenta nuevamente." };
  }
}

export { overlaps };
