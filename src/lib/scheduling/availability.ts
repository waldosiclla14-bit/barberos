// Motor de disponibilidad (secciones 14, 15).
// Nunca muestra horarios falsos: considera horario de sede + barbero,
// descansos/vacaciones/bloqueos, duración del servicio y citas existentes.

import { prisma } from "@/lib/prisma";
import {
  limaDayRange,
  limaToUTC,
  overlaps,
  toLimaParts,
} from "@/lib/scheduling/time";

export const SLOT_STEP_MIN = 15;
export const MAX_ADVANCE_DAYS = 30;

const BUSY_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_SERVICE"];

export interface SlotOption {
  start: string; // ISO UTC
  end: string; // ISO UTC
}

export interface BarberSlots {
  barberId: string;
  barberName: string;
  slots: SlotOption[];
}

export interface AvailabilityResult {
  dateKey: string;
  serviceIds: string[];
  totalDurationMin: number;
  branchId: string;
  barbers: BarberSlots[];
  /** Ranuras combinadas "cualquier barbero" ordenadas por hora (seccion 14) */
  anyBarber: SlotOption[];
  notice?: string;
}

interface Interval {
  start: Date;
  end: Date;
}

function subtractIntervals(
  windows: Interval[],
  busy: Interval[],
): Interval[] {
  let free = windows.map((w) => ({ ...w }));
  for (const b of busy) {
    const next: Interval[] = [];
    for (const f of free) {
      if (!overlaps(f.start, f.end, b.start, b.end)) {
        next.push(f);
        continue;
      }
      if (b.start > f.start) next.push({ start: f.start, end: b.start });
      if (f.end > b.end) next.push({ start: b.end, end: f.end });
    }
    free = next;
  }
  return free.filter((f) => f.end.getTime() - f.start.getTime() > 0);
}

function slotsInFree(
  free: Interval[],
  durationMs: number,
  stepMs: number,
  now: Date,
): SlotOption[] {
  const out: SlotOption[] = [];
  for (const f of free) {
    // Alinear al reloj (:00/:15/:30/:45): los límites de bloques ocupados
    // pueden caer fuera de grilla (p.ej. servicio de 20 min) y los horarios
    // ofrecidos deben mantenerse en pasos fijos de SLOT_STEP_MIN.
    let t = Math.ceil(f.start.getTime() / stepMs) * stepMs;
    while (t + durationMs <= f.end.getTime()) {
      const start = new Date(t);
      if (start > now) {
        out.push({ start: start.toISOString(), end: new Date(t + durationMs).toISOString() });
      }
      t += stepMs;
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

export interface AvailabilityParams {
  tenantId: string;
  branchId: string;
  dateKey: string; // YYYY-MM-DD Lima
  serviceIds: string[];
  barberId?: string | null; // null/undefined = cualquier barbero
}

/**
 * Calcula disponibilidad real para una fecha.
 * Lanza Error con mensaje seguro ante datos inconsistentes.
 */
export async function getAvailability(
  params: AvailabilityParams,
): Promise<AvailabilityResult> {
  const { tenantId, branchId, dateKey, serviceIds } = params;
  const range = limaDayRange(dateKey);
  if (!range) throw new Error("Fecha inválida");

  // Servicios válidos del tenant
  const services = await prisma.service.findMany({
    where: { tenantId, id: { in: serviceIds }, isActive: true },
    select: { id: true, name: true, durationMin: true },
  });
  if (services.length !== serviceIds.length || services.length === 0) {
    throw new Error("Servicio no disponible");
  }
  const totalDurationMin = services.reduce((acc, s) => acc + s.durationMin, 0);

  const parts = toLimaParts(range.start);
  const weekday = parts.weekday;

  // Sede activa + horario de ese día
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId, isActive: true },
    include: {
      branchSchedules: { where: { weekday } },
    },
  });
  if (!branch) throw new Error("Sede no disponible");
  const branchDay = branch.branchSchedules[0];
  if (!branchDay || branchDay.isClosed) {
    return emptyResult(params, totalDurationMin, "La sede no atiende este día.");
  }

  const branchWindow: Interval = {
    start: limaToUTC(parts.year, parts.month, parts.day, branchDay.openMin),
    end: limaToUTC(parts.year, parts.month, parts.day, branchDay.closeMin),
  };

  // Barberos candidatos: activos en la sede que ofrecen TODOS los servicios
  const candidates = await prisma.barber.findMany({
    where: {
      tenantId,
      branchId,
      isActive: true,
      ...(params.barberId ? { id: params.barberId } : {}),
      AND: serviceIds.map((sid) => ({
        services: { some: { serviceId: sid } },
      })),
    },
    select: {
      id: true,
      displayName: true,
      schedules: { where: { weekday } },
      timeOffs: {
        where: { startsAt: { lt: range.end }, endsAt: { gt: range.start } },
        select: { startsAt: true, endsAt: true },
      },
      appointments: {
        where: {
          status: { in: BUSY_STATUSES },
          startsAt: { lt: range.end },
          endsAt: { gt: range.start },
        },
        select: { startsAt: true, endsAt: true },
      },
    },
  });

  // Bloqueos de toda la sede (TimeOff sin barbero)
  const branchTimeOffs = await prisma.timeOff.findMany({
    where: {
      tenantId,
      barberId: null,
      OR: [{ branchId }, { branchId: null }],
      startsAt: { lt: range.end },
      endsAt: { gt: range.start },
    },
    select: { startsAt: true, endsAt: true },
  });

  const now = new Date();
  const durationMs = totalDurationMin * 60 * 1000;
  const stepMs = SLOT_STEP_MIN * 60 * 1000;

  const resultBarbers: BarberSlots[] = [];
  for (const barber of candidates) {
    // Ventanas de trabajo del barbero intersecadas con horario de sede
    const workWindows: Interval[] = barber.schedules
      .map((s) => ({
        start: limaToUTC(parts.year, parts.month, parts.day, s.startMin),
        end: limaToUTC(parts.year, parts.month, parts.day, s.endMin),
      }))
      .map((w) => ({
        start: w.start > branchWindow.start ? w.start : branchWindow.start,
        end: w.end < branchWindow.end ? w.end : branchWindow.end,
      }))
      .filter((w) => w.start < w.end);

    if (workWindows.length === 0) continue;

    const busy: Interval[] = [
      ...barber.appointments.map((a) => ({ start: a.startsAt, end: a.endsAt })),
      ...barber.timeOffs.map((t) => ({ start: t.startsAt, end: t.endsAt })),
      ...branchTimeOffs.map((t) => ({ start: t.startsAt, end: t.endsAt })),
    ];

    const free = subtractIntervals(workWindows, busy);
    const slots = slotsInFree(free, durationMs, stepMs, now);
    if (slots.length > 0) {
      resultBarbers.push({
        barberId: barber.id,
        barberName: barber.displayName,
        slots,
      });
    }
  }

  // Combinar para "cualquier barbero": por cada slot el primer barbero libre
  const byStart = new Map<string, SlotOption>();
  for (const b of resultBarbers) {
    for (const slot of b.slots) {
      if (!byStart.has(slot.start)) byStart.set(slot.start, slot);
    }
  }
  const anyBarber = [...byStart.values()].sort((a, b) =>
    a.start.localeCompare(b.start),
  );

  return {
    dateKey,
    serviceIds,
    totalDurationMin,
    branchId,
    barbers: resultBarbers,
    anyBarber,
    notice:
      anyBarber.length === 0
        ? "Sin disponibilidad para esta fecha. Prueba otro día."
        : undefined,
  };
}

function emptyResult(
  params: AvailabilityParams,
  duration: number,
  notice: string,
): AvailabilityResult {
  return {
    dateKey: params.dateKey,
    serviceIds: params.serviceIds,
    totalDurationMin: duration,
    branchId: params.branchId,
    barbers: [],
    anyBarber: [],
    notice,
  };
}
