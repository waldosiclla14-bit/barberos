import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { upsertTemplateDefaults } from "@/lib/notifications";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChannelSwitch,
  ResetTemplatesButton,
  SendRemindersButton,
} from "./notification-controls";

export const metadata: Metadata = {
  title: "Notificaciones",
};

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  WELCOME: "Bienvenida",
  CONFIRMATION: "Confirmación de reserva",
  REMINDER: "Recordatorio de cita",
  NO_SHOW: "No asistió",
  REBOOK: "Reagendamiento",
};

export default async function NotificacionesPage() {
  const auth = await requirePermission("reports:view");

  // Modo de envío: webhook real si WHATSAPP_ENABLED=true y hay webhook; si no, demo.
  const whatsappEnabled = process.env.WHATSAPP_ENABLED === "true";
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
  const realSending = whatsappEnabled && !!webhookUrl;

  // Garantiza plantillas por defecto (idempotente)
  await upsertTemplateDefaults(auth.tenant.id);

  const [templates, logs] = await Promise.all([
    prisma.notificationTemplate.findMany({
      where: { tenantId: auth.tenant.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, kind: true, name: true, channel: true, body: true, isActive: true },
    }),
    prisma.messageLog.findMany({
      where: { tenantId: auth.tenant.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        channel: true,
        kind: true,
        to: true,
        body: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-wide text-zinc-900">
          Notificaciones
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Plantillas y envío de recordatorios por WhatsApp / email.
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${
              realSending ? "bg-green-500" : "bg-amber-400"
            }`}
          />
          {realSending
            ? "Envío real activo (webhook de WhatsApp configurado)"
            : "Modo demo: los envíos se registran y auditan sin llamadas reales"}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plantillas</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {templates.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No hay plantillas todavía.
                </p>
              ) : (
                templates.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-zinc-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900">
                        {t.name}{" "}
                        <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
                          {KIND_LABELS[t.kind] ?? t.kind}
                        </span>
                      </p>
                      <ChannelSwitch kind={t.kind} current={t.channel} />
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-zinc-600">
                      {t.body}
                    </p>
                  </div>
                ))
              )}
              <div className="pt-2">
                <ResetTemplatesButton />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bitácora de envíos</CardTitle>
            </CardHeader>
            <CardBody className="px-0 py-0">
              {logs.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">
                  Sin envíos todavía. Crea una cita para registrar su confirmación, o usa
                  el botón de recordatorios.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {logs.map((l) => (
                    <li key={l.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {KIND_LABELS[l.kind] ?? l.kind} ·{" "}
                          {l.customer?.name ?? "—"}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            l.channel === "WHATSAPP"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {l.channel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        → {l.to} · {l.createdAt.toLocaleString("es-PE")}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-600">{l.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Recordatorios</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-zinc-600">
            <p>
              Busca todas las citas confirmadas para mañana (hora de Lima) y registra su
              recordatorio personalizado.
            </p>
            <SendRemindersButton />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}