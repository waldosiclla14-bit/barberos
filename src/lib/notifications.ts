// FASE 7: Motor de notificaciones WhatsApp/Email.
// En demo el "envío" se registra en MessageLog y en el audit log (sin llamadas reales).

import { prisma } from "@/lib/prisma";
import { addDaysToKey, limaDayRange, todayLima } from "@/lib/scheduling/time";
import { LIMA_TZ } from "@/lib/scheduling/time";

export interface SendResult {
  sent: number;
  skipped: number;
}

function fmtPhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+51${phone}`;
}

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function upsertTemplateDefaults(tenantId: string) {
  const defaults: Array<{
    kind: string;
    name: string;
    channel: string;
    body: string;
  }> = [
    {
      kind: "WELCOME",
      name: "Bienvenida",
      channel: "WHATSAPP",
      body:
        "¡Hola {{customerName}}! Gracias por registrarte en {{tenantName}}. Estamos para darte el mejor corte. 💈",
    },
    {
      kind: "CONFIRMATION",
      name: "Confirmación de reserva",
      channel: "WHATSAPP",
      body:
        "{{customerName}}, tu cita en {{tenantName}} quedó confirmada: {{service}} el {{date}} a las {{time}} con {{barber}}. ¡Te esperamos!",
    },
    {
      kind: "REMINDER",
      name: "Recordatorio de cita",
      channel: "WHATSAPP",
      body:
        "Oye {{customerName}} 👋, te recordamos tu cita mañana {{date}} a las {{time}} en {{tenantName}} con {{barber}}. Confirma o reagenda por WhatsApp.",
    },
    {
      kind: "NO_SHOW",
      name: "No asistió",
      channel: "WHATSAPP",
      body:
        "Hola {{customerName}}, vimos que no pudiste venir a tu cita. ¿Quieres reagendar? Escríbenos y te encontramos un hueco. 💈",
    },
    {
      kind: "REBOOK",
      name: "Reagendar",
      channel: "WHATSAPP",
      body:
        "{{customerName}}, tu cita en {{tenantName}} fue reagendada para {{date}} a las {{time}} con {{barber}}. ¡Gracias!",
    },
  ];

  for (const d of defaults) {
    const found = await prisma.notificationTemplate.findFirst({
      where: { tenantId, kind: d.kind },
      select: { id: true },
    });
    if (!found) {
      await prisma.notificationTemplate.create({
        data: { tenantId, kind: d.kind, name: d.name, channel: d.channel, body: d.body },
      });
    }
  }
}

async function templateFor(
  tenantId: string,
  kind: string,
): Promise<{ body: string; channel: string } | null> {
  const tpl = await prisma.notificationTemplate.findFirst({
    where: { tenantId, kind, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { body: true, channel: true },
  });
  return tpl;
}

function customerWhatsapp(customer: { phone: string }): string {
  return `https://wa.me/${fmtPhone(customer.phone).replace(/\D/g, "")}`;
}

/**
 * Envío real opcional. Si WHATSAPP_ENABLED=true y WHATSAPP_WEBHOOK_URL está
 * configurado, POSTea el mensaje al webhook del proveedor (WhatsApp Cloud o
 * pasarela compatible). Nunca lanza: en demo (o sin webhook) devuelve true y
 * el envío queda registrado solo en MessageLog.
 */
async function deliverMessage(input: {
  channel: string;
  kind: string;
  to: string;
  body: string;
}): Promise<boolean> {
  const webhook = process.env.WHATSAPP_WEBHOOK_URL;
  if (process.env.WHATSAPP_ENABLED !== "true" || !webhook) return true;
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        channel: input.channel,
        kind: input.kind,
        to: input.to,
        body: input.body,
      }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch (error) {
    console.error("[deliverMessage]", error);
    return false;
  }
}

export async function logMessage(input: {
  tenantId: string;
  customerId?: string | null;
  channel: string;
  kind: string;
  to: string;
  body: string;
}) {
  const delivered = await deliverMessage(input);
  return prisma.messageLog.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId ?? null,
      channel: input.channel,
      kind: input.kind,
      to: input.to,
      body: input.body.slice(0, 1000),
      status: delivered ? "SENT" : "FAILED",
    },
  });
}

/** Confirma por WhatsApp cuando se crea una cita (usada en reserva pública/servidor). */
export async function sendConfirmation(input: {
  tenantId: string;
  tenantName: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  barber: string;
  service: string;
  date: string;
  time: string;
  extra?: { pinpoint: string };
}) {
  const tpl = await templateFor(input.tenantId, "CONFIRMATION");
  const body = render(tpl?.body ?? "{{customerName}}, tu cita fue confirmada.",
    {
      customerName: input.customerName,
      tenantName: input.tenantName,
      barber: input.barber,
      service: input.service,
      date: input.date,
      time: input.time,
    });
  await logMessage({
    tenantId: input.tenantId,
    customerId: input.customerId,
    channel: tpl?.channel ?? "WHATSAPP",
    kind: "CONFIRMATION",
    to: input.customerPhone,
    body,
  });
  return input.extra?.pinpoint ?? "ok";
}

/** Carga una cita recién creada y emite su confirmación (caso público + agenda). */
export async function sendAppointmentConfirmation(
  tenantId: string,
  appointmentId: string,
): Promise<void> {
  try {
    const { prisma: db } = await import("@/lib/prisma");
    const appt = await db.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        tenantId: true,
        startsAt: true,
        customer: { select: { id: true, name: true, phone: true } },
        barber: { select: { displayName: true } },
        services: { select: { serviceName: true } },
        tenant: { select: { name: true } },
      },
    });
    if (!appt || !appt.customer) return;
    await sendConfirmation({
      tenantId,
      tenantName: appt.tenant.name,
      customerId: appt.customer.id,
      customerName: appt.customer.name,
      customerPhone: appt.customer.phone,
      barber: appt.barber.displayName,
      service: appt.services[0]?.serviceName ?? "tu servicio",
      date: appt.startsAt.toLocaleDateString("es-PE", {
        timeZone: LIMA_TZ,
        weekday: "long",
        day: "numeric",
        month: "short",
      }),
      time: appt.startsAt.toLocaleTimeString("es-PE", {
        timeZone: LIMA_TZ,
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  } catch (error) {
    console.error("[sendAppointmentConfirmation]", error);
  }
}

/** Envía recordatorios de las citas de mañana (Lima). Devuelve conteo. */
export async function sendReminders(tenantId: string): Promise<SendResult> {
  const tomorrow = limaDayRange(addDaysToKey(todayLima(), 1));
  if (!tomorrow) return { sent: 0, skipped: 0 };

  const [tpl, appointments, tenants] = await Promise.all([
    templateFor(tenantId, "REMINDER"),
    prisma.appointment.findMany({
      where: {
        tenantId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { gte: tomorrow.start, lt: tomorrow.end },
      },
      select: {
        id: true,
        startsAt: true,
        customer: { select: { id: true, name: true, phone: true } },
        barber: { select: { displayName: true } },
        services: { select: { serviceName: true } },
      },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ]);

  const tenantName = tenants?.name ?? "la barbería";
  let sent = 0;
  let skipped = 0;
  const todayKey = todayLima();
  for (const a of appointments) {
    const cust = a.customer;
    if (!cust) {
      skipped++;
      continue;
    }
    // Dedupe: no reenviar un recordatorio ya enviado hoy a este cliente.
    const todayRange = limaDayRange(todayKey);
    const already = await prisma.messageLog.findFirst({
      where: {
        tenantId,
        customerId: cust.id,
        kind: "REMINDER",
        createdAt: todayRange ? { gte: todayRange.start } : undefined,
      },
      select: { id: true },
    });
    if (already) {
      skipped++;
      continue;
    }
    const date = a.startsAt.toLocaleDateString("es-PE", {
      timeZone: LIMA_TZ,
      weekday: "long",
      day: "numeric",
      month: "short",
    });
    const time = a.startsAt.toLocaleTimeString("es-PE", {
      timeZone: LIMA_TZ,
      hour: "2-digit",
      minute: "2-digit",
    });
    const body = render(tpl?.body ?? "Recordatorio de tu cita {{date}} a las {{time}}.",
      {
        customerName: cust.name,
        tenantName,
        barber: a.barber.displayName,
        service: a.services[0]?.serviceName ?? "tu servicio",
        date,
        time,
      });
    await logMessage({
      tenantId,
      customerId: cust.id,
      channel: tpl?.channel ?? "WHATSAPP",
      kind: "REMINDER",
      to: cust.phone,
      body,
    });
    sent++;
  }
  return { sent, skipped };
}

/**
 * Corre los recordatorios de mañana para todos los tenants activos. Usado por
 * el scheduler externo (ver /api/reminders/run). Nunca lanza por tenant.
 */
export async function runRemindersForAllTenants(): Promise<SendResult> {
  const tenants = await prisma.tenant.findMany({
    where: { status: { not: "SUSPENDED" } },
    select: { id: true },
  });
  let sent = 0;
  let skipped = 0;
  for (const t of tenants) {
    try {
      const r = await sendReminders(t.id);
      sent += r.sent;
      skipped += r.skipped;
    } catch (error) {
      console.error("[runRemindersForAllTenants]", t.id, error);
    }
  }
  return { sent, skipped };
}

export { customerWhatsapp };