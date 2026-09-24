import type { Metadata } from "next";
import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import {
  addDaysToKey,
  limaDayRange,
  todayLima,
  toLimaParts,
  formatHHmm,
} from "@/lib/scheduling/time";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatPEN } from "@/lib/utils";
import { AppointmentActionsBar } from "./appointment-actions";

export const metadata: Metadata = {
  title: "Agenda",
};

interface SearchParams {
  fecha?: string;
  sede?: string;
  barbero?: string;
}

const STATUS_ORDER = [
  "IN_SERVICE",
  "CHECKED_IN",
  "CONFIRMED",
  "PENDING",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
];

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const auth = await requireTenant();
  const canManage = hasPermission(auth.user.role, "appointments:manage");

  const params = await searchParams;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(params.fecha ?? "")
    ? (params.fecha as string)
    : todayLima();

  const branches = await prisma.branch.findMany({
    where: { tenantId: auth.tenant.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const sedeId =
    params.sede && branches.some((b) => b.id === params.sede)
      ? params.sede
      : (branches[0]?.id ?? null);

  const barbers = sedeId
    ? await prisma.barber.findMany({
        where: { tenantId: auth.tenant.id, branchId: sedeId, isActive: true },
        orderBy: { displayName: "asc" },
        select: { id: true, displayName: true },
      })
    : [];

  const barberoId =
    params.barbero && barbers.some((b) => b.id === params.barbero)
      ? params.barbero
      : "";

  const range = limaDayRange(fecha);
  const appointments =
    range && sedeId
      ? await prisma.appointment.findMany({
          where: {
            tenantId: auth.tenant.id,
            branchId: sedeId,
            startsAt: { gte: range.start, lt: range.end },
            ...(barberoId ? { barberId: barberoId } : {}),
          },
          orderBy: { startsAt: "asc" },
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            barber: { select: { id: true, displayName: true } },
          },
        })
      : [];

  // Agrupar por barbero para vista tipo agenda
  const byBarber = new Map<string, typeof appointments>();
  for (const appt of appointments) {
    const key = appt.barberId;
    if (!byBarber.has(key)) byBarber.set(key, []);
    byBarber.get(key)?.push(appt);
  }
  const groups = [...byBarber.entries()]
    .map(([barberId, list]) => ({
      barber:
        barbers.find((b) => b.id === barberId) ??
        list[0]?.barber ?? { id: barberId, displayName: "—" },
      list: [...list].sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
          a.startsAt.getTime() - b.startsAt.getTime(),
      ),
    }))
    .sort((a, b) => a.barber.displayName.localeCompare(b.barber.displayName));

  const dayLabel = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  function linkWith(overrides: Partial<SearchParams>) {
    const sp = new URLSearchParams();
    sp.set("fecha", overrides.fecha ?? fecha);
    if ((overrides.sede ?? sedeId)) sp.set("sede", overrides.sede ?? sedeId ?? "");
    if ((overrides.barbero ?? barberoId)) sp.set("barbero", overrides.barbero ?? barberoId);
    return `/agenda?${sp.toString()}`;
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-wide text-zinc-900">
            Agenda
          </h1>
          <p className="mt-0.5 text-sm capitalize text-zinc-600">{dayLabel}</p>
        </div>
        {canManage && sedeId && (
          <Link href={`/agenda/nueva?sede=${sedeId}&fecha=${fecha}`}>
            <Button>+ Nueva reserva</Button>
          </Link>
        )}
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={linkWith({ fecha: addDaysToKey(fecha, -1) })}>
          <Button variant="secondary">←</Button>
        </Link>
        <Link href={linkWith({ fecha: todayLima() })}>
          <Button variant={fecha === todayLima() ? "primary" : "secondary"}>
            Hoy
          </Button>
        </Link>
        <Link href={linkWith({ fecha: addDaysToKey(fecha, 1) })}>
          <Button variant="secondary">→</Button>
        </Link>

        {branches.length > 1 && (
          <nav className="flex flex-wrap gap-1.5" aria-label="Sedes">
            {branches.map((b) => (
              <Link
                key={b.id}
                href={linkWith({ sede: b.id })}
                className={`rounded-lg px-3 py-1.5 font-medium ${
                  b.id === sedeId
                    ? "bg-(--accent) text-(--accent-ink)"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {b.name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {barbers.length > 0 && (
        <nav className="flex flex-wrap gap-1.5" aria-label="Barberos">
          <Link
            href={linkWith({ barbero: "" })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              !barberoId ? "bg-(--accent) text-(--accent-ink)" : "border border-zinc-300 bg-white text-zinc-600"
            }`}
          >
            Todos los barberos
          </Link>
          {barbers.map((b) => (
            <Link
              key={b.id}
              href={linkWith({ barbero: b.id })}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                b.id === barberoId
                  ? "bg-(--accent) text-(--accent-ink)"
                  : "border border-zinc-300 bg-white text-zinc-600"
              }`}
            >
              {b.displayName}
            </Link>
          ))}
        </nav>
      )}

      {/* Contenido */}
      {groups.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="text-sm font-medium text-zinc-700">
              Todavía no tienes reservas este día.
            </p>
            {canManage && sedeId && (
              <Link
                href={`/agenda/nueva?sede=${sedeId}&fecha=${fecha}`}
                className="mt-3 inline-block"
              >
                <Button variant="secondary">Crear primera reserva</Button>
              </Link>
            )}
            {!canManage && (
              <p className="mt-2 text-xs text-zinc-500">
                Las reservas aparecerán aquí cuando los clientes agenden.
              </p>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.barber.id}>
              <CardBody className="space-y-2">
                <h2 className="text-sm font-bold text-zinc-900">
                  {group.barber.displayName}
                  <span className="ml-2 text-xs font-normal text-zinc-400">
                    {group.list.length} reserva(s)
                  </span>
                </h2>
                <ul className="divide-y divide-zinc-100">
                  {group.list.map((appt) => {
                    const p = toLimaParts(appt.startsAt);
                    return (
                      <li key={appt.id} className="py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold tabular-nums text-zinc-900">
                              {formatHHmm(p.minutes)}
                              <span className="ml-2">{appt.customer.name}</span>
                            </p>
                            <p className="mt-0.5 truncate text-xs text-zinc-500">
                              {appt.customer.phone}
                            </p>
                            <p className="mt-1 text-xs text-zinc-600">
                              {appt.priceCents > 0 && (
                                <span className="font-semibold">
                                  {formatPEN(appt.priceCents / 100)}
                                </span>
                              )}
                            </p>
                          </div>
                          <StatusBadge status={appt.status} />
                        </div>
                        {canManage && (
                          <AppointmentActionsBar
                            appointmentId={appt.id}
                            status={appt.status}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
