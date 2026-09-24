import type { Metadata } from "next";
import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { limaDayRange, todayLima } from "@/lib/scheduling/time";

export const metadata: Metadata = {
  title: "Dashboard",
};

const PLAN_STATUS_LABELS: Record<string, string> = {
  TRIAL: "Prueba gratis",
  ACTIVE: "Activo",
  PAST_DUE: "Pago pendiente",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

function daysLeft(date: Date): number {
  return Math.max(
    0,
    Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenant, user } = await requireTenant();
  const params = await searchParams;
  const bienvenida = "bienvenida" in params && params.bienvenida === "1";

  const [userCount, branchCount, serviceCount, barberCount, todayRange, recentActivity] =
    await Promise.all([
      prisma.user.count({ where: { tenantId: tenant.id, isActive: true } }),
      prisma.branch.count({ where: { tenantId: tenant.id, isActive: true } }),
      prisma.service.count({ where: { tenantId: tenant.id, isActive: true } }),
      prisma.barber.count({ where: { tenantId: tenant.id, isActive: true } }),
      limaDayRange(todayLima()),
      prisma.auditLog.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, action: true, entity: true, createdAt: true },
      }),
    ]);

  const todayAppointments = todayRange
    ? await prisma.appointment.groupBy({
        by: ["status"],
        where: {
          tenantId: tenant.id,
          startsAt: { gte: todayRange.start, lt: todayRange.end },
        },
        _count: { _all: true },
      })
    : [];
  const apptCount = (status: string) =>
    todayAppointments.find((a) => a.status === status)?._count._all ?? 0;
  const citasHoy = todayAppointments.reduce((acc, a) => acc + a._count._all, 0);

  const checklist = [
    {
      label: "Cuenta creada",
      done: true,
      href: null as string | null,
    },
    {
      label: "Datos del negocio",
      done: tenant.name !== "",
      href: "/configuracion",
    },
    {
      label: "Sedes y servicios",
      done: branchCount > 0 && serviceCount > 0,
      href: "/servicios",
    },
    {
      label: "Barberos y horarios",
      done: barberCount > 0,
      href: "/barberos",
    },
    {
      label: "Primera reserva",
      done: citasHoy > 0,
      href: "/agenda/nueva",
    },
  ];

  const completed = checklist.filter((c) => c.done).length;
  const progress = Math.round((completed / checklist.length) * 100);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Hola, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Resumen de {tenant.name}.
        </p>
      </header>

      {bienvenida && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          Tu barbería está lista. Completa la configuración para empezar a
          recibir reservas.
        </div>
      )}

      <section aria-label="Estado de suscripción" className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Plan
            </p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{tenant.plan}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {PLAN_STATUS_LABELS[tenant.status] ?? tenant.status}
              {tenant.trialEndsAt &&
                ` · ${daysLeft(tenant.trialEndsAt)} días restantes`}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Citas hoy
            </p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{citasHoy}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {apptCount("PENDING")} pendientes · {apptCount("CONFIRMED")} confirmadas ·{" "}
              {apptCount("COMPLETED")} completadas
            </p>
            <Link
              href="/agenda"
              className="mt-2 inline-block text-xs font-semibold text-zinc-900 hover:underline"
            >
              Ver agenda →
            </Link>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Catálogo operativo
            </p>
            <p className="mt-1 text-sm text-zinc-700">
              {branchCount} {branchCount === 1 ? "sede" : "sedes"} ·{" "}
              {serviceCount} {serviceCount === 1 ? "servicio" : "servicios"} ·{" "}
              {barberCount} {barberCount === 1 ? "barbero" : "barberos"} ·{" "}
              {userCount} {userCount === 1 ? "usuario" : "usuarios"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Gestión de usuarios avanzada disponible próximamente
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Progreso de configuración
            </p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{progress}%</p>
            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-zinc-900 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuración inicial</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm">
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
                        item.done
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-zinc-300 bg-white text-zinc-400"
                      }`}
                    >
                      ✓
                    </span>
                    <span className={item.done ? "text-zinc-500 line-through" : "text-zinc-700"}>
                      {item.label}
                    </span>
                  </span>
                  {item.href && !item.done && (
                    <Link
                      href={item.href}
                      className="text-sm font-semibold text-zinc-900 hover:underline"
                    >
                      Completar
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
          </CardHeader>
          <CardBody>
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">
                Todavía no hay actividad registrada.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {recentActivity.map((log) => (
                  <li key={log.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-medium text-zinc-800">
                      {log.action.replaceAll("_", " ").toLowerCase()}
                      <span className="ml-1 font-normal text-zinc-500">
                        · {log.entity}
                      </span>
                    </span>
                    <time
                      dateTime={log.createdAt.toISOString()}
                      className="whitespace-nowrap text-xs text-zinc-400"
                    >
                      {log.createdAt.toLocaleString("es-PE", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
