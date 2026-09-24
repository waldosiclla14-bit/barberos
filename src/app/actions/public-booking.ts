"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { createAppointmentSafe } from "@/lib/scheduling/appointments";
import { sendAppointmentConfirmation } from "@/lib/notifications";
import { limaToUTC, parseDateKey, parseHHmm } from "@/lib/scheduling/time";

export interface PublicBookingState {
  error?: string;
  success?: boolean;
}

const schema = z.object({
  slug: z.string().trim().min(1),
  branchId: z.string().min(1),
  barberId: z.string().min(1), // "any" permitido
  serviceIds: z.array(z.string().min(1)).min(1, "Selecciona al menos un servicio"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(3, "Ingresa tu nombre").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^(\+51)?9\d{8}$/, "Teléfono peruano inválido (ej. 987654321)"),
});

/**
 * Reserva pública como invitado (secciones 73-74).
 * Si el cliente eligió "cualquier barbero", se asigna el primero libre en ese slot.
 */
export async function publicBookingAction(
  _prev: PublicBookingState,
  formData: FormData,
): Promise<PublicBookingState> {
  const serviceIds = formData.getAll("serviceIds").map(String).filter(Boolean);
  const parsed = schema.safeParse({
    slug: formData.get("slug"),
    branchId: formData.get("branchId"),
    barberId: formData.get("barberId") || "any",
    serviceIds,
    date: formData.get("date"),
    time: formData.get("time"),
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: data.slug },
    select: { id: true, allowGuestBooking: true },
  });
  if (!tenant) {
    return { error: "Barbería no encontrada." };
  }
  if (!tenant.allowGuestBooking) {
    return { error: "Esta barbería no acepta reservas en línea. Contáctalos directamente." };
  }

  const d = parseDateKey(data.date);
  const m = parseHHmm(data.time);
  if (!d || m === null) return { error: "Horario inválido." };
  const startsAt = limaToUTC(d.y, d.m, d.d, m);

  // Resolver barbero concreto
  const barberId = data.barberId;
  if (barberId === "any") {
    const candidates = await prisma.barber.findMany({
      where: {
        tenantId: tenant.id,
        branchId: data.branchId,
        isActive: true,
        AND: data.serviceIds.map((sid) => ({
          services: { some: { serviceId: sid } },
        })),
      },
      select: { id: true },
    });
    if (candidates.length === 0) {
      return { error: "Sin disponibilidad para ese horario. Vuelve e intenta otra hora." };
    }

    // El motor de disponibilidad decide quién está realmente libre:
    // probamos con cada candidato hasta que uno no choque.
    let created: string | null = null;
    let lastError = "";
    for (const candidate of candidates) {
      const result = await createAppointmentSafe({
        tenantId: tenant.id,
        branchId: data.branchId,
        barberId: candidate.id,
        serviceIds: data.serviceIds,
        startsAt,
        customer: { name: data.name, phone: data.phone },
        source: "ONLINE",
      });
      if (result.ok) {
        created = result.appointmentId;
        break;
      }
      lastError = result.error;
    }
    if (!created) {
      return { error: lastError || "Ese horario acaba de ocuparse. Elige otro." };
    }
    await sendAppointmentConfirmation(tenant.id, created);
    return { success: true };
  }

  const result = await createAppointmentSafe({
    tenantId: tenant.id,
    branchId: data.branchId,
    barberId,
    serviceIds: data.serviceIds,
    startsAt,
    customer: { name: data.name, phone: data.phone },
    source: "ONLINE",
  });
  if (!result.ok) return { error: result.error };

  await audit({
    tenantId: tenant.id,
    action: "APPOINTMENT_CREATED_ONLINE",
    entity: "Appointment",
    entityId: result.appointmentId,
  });

  await sendAppointmentConfirmation(tenant.id, result.appointmentId);

  return { success: true };
}
