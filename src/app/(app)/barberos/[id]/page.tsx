import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { minutesToHHmm, todayLima, toLimaParts } from "@/lib/scheduling/time";
import { formatHHmm } from "@/lib/scheduling/time";
import {
  deleteTimeOffAction,
} from "@/app/actions/barbers";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarberScheduleForm,
  EditBarberForm,
} from "../barber-forms";
import { BarberServicesForm, TimeOffForm } from "./detail-forms";

export const metadata: Metadata = {
  title: "Detalle de barbero",
};

export default async function BarberoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePermission("barbers:manage");
  const { id } = await params;

  const barber = await prisma.barber.findFirst({
    where: { id, tenantId: auth.tenant.id },
    include: {
      branch: { select: { name: true } },
      schedules: { orderBy: { weekday: "asc" } },
      timeOffs: {
        where: { endsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
      },
    },
  });
  if (!barber) notFound();

  const allServices = await prisma.service.findMany({
    where: { tenantId: auth.tenant.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const assignedIds = new Set(
    (
      await prisma.barberService.findMany({
        where: { barberId: barber.id },
        select: { serviceId: true },
      })
    ).map((x) => x.serviceId),
  );

  const schedules = Array.from({ length: 7 }, (_, weekday) => {
    const found = barber.schedules.find((s) => s.weekday === weekday);
    return {
      weekday,
      start: found ? minutesToHHmm(found.startMin) : "",
      end: found ? minutesToHHmm(found.endMin) : "",
    };
  });

  const todayKey = todayLima();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {barber.displayName}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-600">{barber.branch.name}</p>
        </div>
        <Link href="/barberos" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
          ← Barberos
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos</CardTitle>
          </CardHeader>
          <CardBody>
            <EditBarberForm
              barber={{
                id: barber.id,
                displayName: barber.displayName,
                specialties: barber.specialties,
                isActive: barber.isActive,
              }}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jornada semanal</CardTitle>
          </CardHeader>
          <CardBody>
            <BarberScheduleForm barberId={barber.id} schedules={schedules} />
            <p className="mt-3 text-xs text-zinc-500">
              Deja ambos campos vacíos para marcar el día libre.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Servicios que ofrece</CardTitle>
          </CardHeader>
          <CardBody>
            <BarberServicesForm
              barberId={barber.id}
              services={allServices.map((s) => ({
                ...s,
                assigned: assignedIds.has(s.id),
              }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vacaciones y bloqueos</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {barber.timeOffs.length > 0 && (
              <ul className="divide-y divide-zinc-100">
                {barber.timeOffs.map((t) => {
                  const p = toLimaParts(t.startsAt);
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        <span className="font-semibold text-zinc-800 tabular-nums">
                          {p.day}/{String(p.month).padStart(2, "0")} {formatHHmm(p.minutes)}
                        </span>
                        {t.reason && (
                          <span className="ml-2 text-xs text-zinc-500">{t.reason}</span>
                        )}
                      </span>
                      <form action={deleteTimeOffAction}>
                        <input type="hidden" name="timeOffId" value={t.id} />
                        <Button variant="ghost" className="h-7 px-2 text-xs text-red-600">
                          Quitar
                        </Button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
            <TimeOffForm barberId={barber.id} defaultDate={todayKey} />
            <p className="text-xs text-zinc-500">
              Durante un bloqueo el barbero no aparece disponible en la agenda
              ni en reservas online.
            </p>
          </CardBody>
        </Card>
      </div>

      {!barber.isActive && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Este barbero está inactivo: no recibe nuevas reservas.
        </p>
      )}
    </div>
  );
}
