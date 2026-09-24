"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthContext, requirePermission, requireTenant } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { audit } from "@/lib/audit";
import {
  createAppointmentSafe,
  transitionAppointment,
  rescheduleAppointment,
  type Transition,
} from "@/lib/scheduling/appointments";
import { parseDateKey, parseHHmm, limaToUTC } from "@/lib/scheduling/time";
import { sendAppointmentConfirmation, sendAppointmentRebook } from "@/lib/notifications";

export interface FormState {
  error?: string;
  success?: boolean;
  appointmentId?: string;
}

const bookingSchema = z.object({
  branchId: z.string().min(1),
  barberId: z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1, "Selecciona al menos un servicio"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  customerId: z.string().optional(),
  customerName: z.string().trim().max(80).optional(),
  customerPhone: z
    .string()
    .trim()
    .regex(/^(\+51)?9\d{8}$/, "Teléfono peruano inválido (ej. 987654321)")
    .optional(),
  notes: z.string().trim().max(300).optional(),
});

function startFromParts(date: string, time: string): Date | null {
  const d = parseDateKey(date);
  const m = parseHHmm(time);
  if (!d || m === null) return null;
  return limaToUTC(d.y, d.m, d.d, m);
}

/** Reserva manual del staff (agenda) — INTERNAL o WALK_IN. */
export async function createInternalAppointmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requirePermission("appointments:manage");
  if (!hasPermission(auth.user.role, "appointments:manage")) {
    return { error: "Sin permiso para crear reservas." };
  }

  const serviceIds = formData.getAll("serviceIds").map(String).filter(Boolean);
  const parsed = bookingSchema.safeParse({
    branchId: formData.get("branchId"),
    barberId: formData.get("barberId"),
    serviceIds,
    date: formData.get("date"),
    time: formData.get("time"),
    customerId: formData.get("customerId") ?? undefined,
    customerName: formData.get("customerName") ?? undefined,
    customerPhone: String(formData.get("customerPhone") ?? "").trim() || undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  const startsAt = startFromParts(data.date, data.time);
  if (!startsAt) return { error: "Fecha u hora inválida." };

  const source =
    formData.get("source") === "WALK_IN" ? "WALK_IN" : ("INTERNAL" as const);

  // Cliente existente por id tiene prioridad; si no, nombre+teléfono crean/encuentran
  let customerRef: { id?: string; name?: string; phone?: string } = {};
  if (data.customerId) {
    const existing = await prisma.customer.findFirst({
      where: { id: data.customerId, tenantId: auth.tenant.id },
      select: { id: true },
    });
    if (existing) customerRef = { id: existing.id };
  }
  if (!customerRef.id) {
    if (!data.customerName || !data.customerPhone) {
      return { error: "Ingresa el nombre y teléfono del cliente." };
    }
    customerRef = { name: data.customerName, phone: data.customerPhone };
  }

  const result = await createAppointmentSafe({
    tenantId: auth.tenant.id,
    branchId: data.branchId,
    barberId: data.barberId,
    serviceIds: data.serviceIds,
    startsAt,
    customer: customerRef,
    source: source as "INTERNAL" | "WALK_IN",
    notes: data.notes,
  });
  if (!result.ok) return { error: result.error };

  // El walk-in llegó físicamente: check-in inmediato
  if (source === "WALK_IN") {
    await transitionAppointment(auth.tenant.id, result.appointmentId, "CHECK_IN", {
      userId: auth.user.id,
    });
  }

  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: source === "WALK_IN" ? "APPOINTMENT_WALK_IN" : "APPOINTMENT_CREATED_INTERNAL",
    entity: "Appointment",
    entityId: result.appointmentId,
  });

  if (source !== "WALK_IN") {
    await sendAppointmentConfirmation(auth.tenant.id, result.appointmentId);
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect(`/agenda?fecha=${encodeURIComponent(data.date)}`);
}

/** Transiciones de estado. BARBER puede operar solo sobre SUS citas. */
export async function appointmentTransitionAction(formData: FormData) {
  const auth = await getAuthContext();
  if (!auth?.tenant) return;

  const appointmentId = String(formData.get("appointmentId") ?? "");
  const transition = String(formData.get("transition") ?? "") as Transition;
  const cancelReason = formData.get("cancelReason")
    ? String(formData.get("cancelReason"))
    : undefined;
  if (!appointmentId || !transition) return;

  if (auth.user.role === "BARBER") {
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId: auth.tenant.id },
      select: { barber: { select: { userId: true } }, status: true },
    });
    if (!appt || appt.barber.userId !== auth.user.id) return;
    const allowedForBarber: Transition[] = ["CHECK_IN", "START_SERVICE", "COMPLETE_SERVICE", "NO_SHOW"];
    if (!allowedForBarber.includes(transition)) return;
  } else if (!hasPermission(auth.user.role, "appointments:manage")) {
    return;
  }

  await transitionAppointment(auth.tenant.id, appointmentId, transition, {
    userId: auth.user.id,
    cancelReason,
  });

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

const RESCHEDULE_MAX_DAYS_AHEAD = 60;

/** Reprogramar cita (staff). */
export async function rescheduleAppointmentFormAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireTenant();
  if (!hasPermission(auth.user.role, "appointments:manage")) {
    return { error: "Sin permiso." };
  }

  const appointmentId = String(formData.get("appointmentId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");

  const startsAt = startFromParts(date, time);
  if (!startsAt) return { error: "Fecha u hora inválida." };
  if (startsAt > new Date(Date.now() + RESCHEDULE_MAX_DAYS_AHEAD * 86400000)) {
    return { error: "No puedes reprogramar tan lejos en el futuro." };
  }

  const result = await rescheduleAppointment(auth.tenant.id, appointmentId, startsAt, {
    userId: auth.user.id,
  });
  if (!result.ok) return { error: result.error };

  await sendAppointmentRebook(auth.tenant.id, appointmentId);

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { success: true };
}
