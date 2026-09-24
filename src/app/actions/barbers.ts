"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { requirePermission, getAuthContext } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { parseHHmm, limaToUTC, parseDateKey } from "@/lib/scheduling/time";

export interface FormState {
  error?: string;
  success?: boolean;
}

const barberSchema = z.object({
  displayName: z.string().trim().min(2, "Nombre muy corto").max(60),
  specialties: z.string().trim().max(160).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Email inválido").optional().or(z.literal("")),
  password: z.string().max(72).optional(),
});

/** Crea barbero con acceso opcional a la app (rol BARBER). */
export async function createBarberAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requirePermission("barbers:manage");

  const branchId = String(formData.get("branchId") ?? "");
  const wantsAccess = formData.get("wantsAccess") === "on";

  const parsed = barberSchema.safeParse({
    displayName: formData.get("displayName"),
    specialties: formData.get("specialties") ?? "",
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId: auth.tenant.id, isActive: true },
    select: { id: true },
  });
  if (!branch) return { error: "Sede inválida." };

  if (wantsAccess) {
    if (!parsed.data.email) return { error: "Ingresa el email de acceso." };
    if (!parsed.data.password || parsed.data.password.length < 8) {
      return { error: "La contraseña debe tener al menos 8 caracteres." };
    }
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existing) return { error: "Ese email ya está en uso." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      let userId: string | null = null;
      if (wantsAccess && parsed.data.email && parsed.data.password) {
        const user = await tx.user.create({
          data: {
            tenantId: auth.tenant.id,
            email: parsed.data.email,
            name: parsed.data.displayName,
            passwordHash: await hashPassword(parsed.data.password),
            role: "BARBER",
          },
          select: { id: true },
        });
        userId = user.id;
      }

      const barber = await tx.barber.create({
        data: {
          tenantId: auth.tenant.id,
          branchId,
          userId,
          displayName: parsed.data.displayName,
          specialties: parsed.data.specialties || null,
        },
      });

      // Sin horarios iniciales: no aparece disponible hasta configurarlos
      await tx.auditLog.create({
        data: {
          tenantId: auth.tenant.id,
          userId: auth.user.id,
          action: "BARBER_CREATED",
          entity: "Barber",
          entityId: barber.id,
          metadata: JSON.stringify({ name: barber.displayName }),
        },
      });

      revalidatePath("/barberos");
    });
  } catch (error) {
    console.error("[createBarber] Error:", error);
    return { error: "No pudimos crear el barbero." };
  }

  return { success: true };
}

export async function updateBarberAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requirePermission("barbers:manage");
  const barberId = String(formData.get("barberId") ?? "");
  const isActive = formData.get("isActive") === "on";

  const parsed = barberSchema.safeParse({
    displayName: formData.get("displayName"),
    specialties: formData.get("specialties") ?? "",
    email: "",
    password: undefined,
  });
  if (!parsed.success || !barberId) {
    return { error: parsed.error?.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    await prisma.barber.updateMany({
      where: { id: barberId, tenantId: auth.tenant.id },
      data: {
        displayName: parsed.data.displayName,
        specialties: parsed.data.specialties || null,
        isActive,
      },
    });
    await audit({
      userId: auth.user.id,
      tenantId: auth.tenant.id,
      action: "BARBER_UPDATED",
      entity: "Barber",
      entityId: barberId,
      metadata: { isActive },
    });
  } catch (error) {
    console.error("[updateBarber] Error:", error);
    return { error: "No pudimos guardar los cambios." };
  }

  revalidatePath("/barberos");
  revalidatePath(`/barberos/${barberId}`);
  return { success: true };
}

const scheduleDaySchema = z.object({
  startMin: z.number().int().min(0).max(1440),
  endMin: z.number().int().min(0).max(1440),
});

/** Guarda la jornada semanal del barbero. */
export async function setBarberScheduleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requirePermission("barbers:manage");
  const barberId = String(formData.get("barberId") ?? "");
  if (!barberId) return { error: "Barbero inválido." };

  const barber = await prisma.barber.findFirst({
    where: { id: barberId, tenantId: auth.tenant.id },
    select: { id: true },
  });
  if (!barber) return { error: "Barbero no encontrado." };

  const rows: { weekday: number; startMin: number; endMin: number }[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const rawStart = String(formData.get(`start-${weekday}`) ?? "");
    const rawEnd = String(formData.get(`end-${weekday}`) ?? "");
    if (!rawStart && !rawEnd) continue; // día libre
    const startMin = parseHHmm(rawStart);
    const endMin = parseHHmm(rawEnd);
    if (startMin === null || endMin === null || startMin >= endMin) {
      return { error: `Horario inválido el día ${weekday}.` };
    }
    const check = scheduleDaySchema.safeParse({ startMin, endMin });
    if (!check.success) return { error: `Horario inválido el día ${weekday}.` };
    rows.push({ weekday, startMin, endMin });
  }

  try {
    await prisma.$transaction([
      prisma.barberSchedule.deleteMany({ where: { barberId } }),
      ...(rows.length > 0
        ? [prisma.barberSchedule.createMany({ data: rows.map((r) => ({ barberId, ...r })) })]
        : []),
    ]);
    await audit({
      userId: auth.user.id,
      tenantId: auth.tenant.id,
      action: "BARBER_SCHEDULE_SET",
      entity: "Barber",
      entityId: barberId,
      metadata: { days: rows.length },
    });
  } catch (error) {
    console.error("[setBarberSchedule] Error:", error);
    return { error: "No pudimos guardar el horario." };
  }

  revalidatePath(`/barberos/${barberId}`);
  return { success: true };
}

const timeOffSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().trim().max(140).optional().or(z.literal("")),
});

/** Registra vacaciones/bloqueo. barberId vacío = bloquea sede completa. */
export async function createTimeOffAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await getAuthContext();
  if (!auth?.tenant) return { error: "Sesión requerida." };
  if (!["OWNER", "MANAGER", "RECEPTIONIST"].includes(auth.user.role)) {
    return { error: "Sin permiso para esta acción." };
  }
  const tenantId = auth.tenant.id;

  const scope = String(formData.get("scope") ?? "barber"); // barber | branch
  const barberIdRaw = String(formData.get("barberId") ?? "");
  const branchIdRaw = String(formData.get("branchId") ?? "");

  const parsed = timeOffSchema.safeParse({
    startDate: formData.get("startDate"),
    startTime: formData.get("startTime"),
    endDate: formData.get("endDate"),
    endTime: formData.get("endTime"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const s = parseDateKey(parsed.data.startDate);
  const e = parseDateKey(parsed.data.endDate);
  const st = parseHHmm(parsed.data.startTime);
  const et = parseHHmm(parsed.data.endTime);
  if (!s || !e || st === null || et === null) {
    return { error: "Fecha u hora inválida." };
  }

  const startsAt = limaToUTC(s.y, s.m, s.d, st);
  const endsAt = limaToUTC(e.y, e.m, e.d, et);
  if (startsAt >= endsAt) return { error: "El fin debe ser posterior al inicio." };

  let barberId: string | null = null;
  let branchId: string | null = null;

  if (scope === "branch") {
    if (!branchIdRaw) return { error: "Selecciona una sede." };
    const branch = await prisma.branch.findFirst({
      where: { id: branchIdRaw, tenantId },
      select: { id: true },
    });
    if (!branch) return { error: "Sede no encontrada." };
    branchId = branch.id;
  } else {
    if (!barberIdRaw) return { error: "Selecciona un barbero." };
    const barber = await prisma.barber.findFirst({
      where: { id: barberIdRaw, tenantId },
      select: { id: true, branchId: true },
    });
    if (!barber) return { error: "Barbero no encontrado." };
    barberId = barber.id;
    branchId = barber.branchId;
  }

  try {
    await prisma.timeOff.create({
      data: {
        tenantId,
        barberId,
        branchId,
        startsAt,
        endsAt,
        reason: parsed.data.reason || null,
      },
    });
    await audit({
      userId: auth.user.id,
      tenantId,
      action: "TIMEOFF_CREATED",
      entity: "TimeOff",
      metadata: { barberId, branchId, scope },
    });
  } catch (error) {
    console.error("[createTimeOff] Error:", error);
    return { error: "No pudimos registrar el bloqueo." };
  }

  revalidatePath(barberId ? `/barberos/${barberId}` : "/sedes");
  return { success: true };
}

export async function deleteTimeOffAction(formData: FormData) {
  const auth = await getAuthContext();
  if (!auth?.tenant) return;
  if (!["OWNER", "MANAGER", "RECEPTIONIST"].includes(auth.user.role)) return;

  const timeOffId = String(formData.get("timeOffId") ?? "");
  await prisma.timeOff.deleteMany({
    where: { id: timeOffId, tenantId: auth.tenant.id },
  });
  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: "TIMEOFF_DELETED",
    entity: "TimeOff",
    entityId: timeOffId,
  });
  revalidatePath("/barberos");
}
