import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import {
  CustomerForm,
  CustomerNoteForm,
  ReopenCustomerForm,
  ToggleCustomerActive,
} from "../customer-forms";

export const metadata: Metadata = {
  title: "Cliente",
};

function fmtDateTime(d: Date): string {
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePermission("customers:view");
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: auth.tenant.id },
    include: {
      preferredBarber: { select: { displayName: true } },
    },
  });
  if (!customer) notFound();

  const [barbers, notes, appointments, upcomingCount] = await Promise.all([
    prisma.barber.findMany({
      where: { tenantId: auth.tenant.id, isActive: true },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
    prisma.customerNote.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { customerId: customer.id, tenantId: auth.tenant.id },
      orderBy: { startsAt: "desc" },
      take: 30,
      select: {
        id: true,
        status: true,
        startsAt: true,
        priceCents: true,
        barber: { select: { displayName: true } },
        branch: { select: { name: true } },
        services: {
          select: { serviceName: true },
        },
      },
    }),
    prisma.appointment.count({
      where: {
        customerId: customer.id,
        tenantId: auth.tenant.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { gte: new Date() },
      },
    }),
  ]);

  const canManage = hasPermission(auth.user.role, "customers:manage");
  const birthDate = customer.birthDate
    ? customer.birthDate.toISOString().slice(0, 10)
    : "";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">
            <Link href="/clientes" className="hover:underline">
              Clientes
            </Link>{" "}
            /
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {customer.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {customer.phone}
            {customer.email ? ` · ${customer.email}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!customer.isActive && (
            <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600">
              Inactivo
            </span>
          )}
          {customer.isActive && canManage && <ToggleCustomerActive customerId={customer.id} />}
          {!customer.isActive && canManage && <ReopenCustomerForm customerId={customer.id} />}
        </div>
      </header>

      <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Visitas</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{customer.visitCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Última visita
            </p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {customer.lastVisitAt ? fmtDateTime(customer.lastVisitAt) : "—"}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Próximas citas
            </p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{upcomingCount}</p>
          </CardBody>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de citas</CardTitle>
            </CardHeader>
            <CardBody className="px-0 py-0">
              {appointments.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">
                  Sin citas todavía.{" "}
                  <Link href="/agenda/nueva" className="font-semibold underline">
                    Agenda una ahora
                  </Link>
                  .
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {appointments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900">
                          {a.services[0]?.serviceName ?? "Servicio"}
                          {a.services.length > 1 && ` +${a.services.length - 1}`}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          {fmtDateTime(a.startsAt)} · {a.barber.displayName} · {a.branch.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={a.status} />
                        <p className="mt-1 text-xs text-zinc-500">
                          S/ {(a.priceCents / 100).toFixed(2)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notas de seguimiento</CardTitle>
            </CardHeader>
            <CardBody className="px-0 py-0">
              {notes.length === 0 ? (
                <p className="px-5 py-6 text-sm text-zinc-500">
                  Sin notas todavía.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {notes.map((n) => (
                    <li key={n.id} className="px-5 py-3">
                      <p className="text-sm text-zinc-800">{n.body}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {n.user?.name ?? "Staff"} · {fmtDateTime(n.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-zinc-100 px-5 py-4">
                <CustomerNoteForm customerId={customer.id} />
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="self-start">
            <CardHeader>
              <CardTitle>Datos del cliente</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Preferencia</dt>
                  <dd className="font-medium text-zinc-900">
                    {customer.preferredBarber?.displayName ?? "Sin preferencia"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Cumpleaños</dt>
                  <dd className="font-medium text-zinc-900">
                    {customer.birthDate
                      ? customer.birthDate.toLocaleDateString("es-PE", {
                          day: "2-digit",
                          month: "long",
                        })
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Cliente desde</dt>
                  <dd className="font-medium text-zinc-900">
                    {fmtDateTime(customer.createdAt)}
                  </dd>
                </div>
                {customer.notes && (
                  <div className="pt-1">
                    <dt className="text-zinc-500">Notas</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-zinc-800">
                      {customer.notes}
                    </dd>
                  </div>
                )}
              </dl>
              {canManage && (
                <CustomerForm
                  customer={{
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    birthDate,
                    notes: customer.notes,
                    preferredBarberId: customer.preferredBarberId,
                  }}
                  barbers={barbers}
                  formId={`edit-${customer.id}`}
                />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}