import type { Metadata } from "next";
import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { todayLima } from "@/lib/scheduling/time";
import { NewAppointmentForm } from "./new-appointment-form";

export const metadata: Metadata = {
  title: "Nueva reserva",
};

export default async function NuevaReservaPage({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string; fecha?: string; tipo?: string }>;
}) {
  const auth = await requireTenant();
  if (!hasPermission(auth.user.role, "appointments:manage")) {
    return <p className="text-sm text-zinc-600">Sin permiso para esta página.</p>;
  }

  const params = await searchParams;

  const branches = await prisma.branch.findMany({
    where: { tenantId: auth.tenant.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  if (branches.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <p className="text-sm font-medium text-zinc-700">
          Primero crea una sede para poder agendar.
        </p>
        <Link href="/sedes" className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline">
          Crear sede
        </Link>
      </div>
    );
  }

  const services = await prisma.service.findMany({
    where: { tenantId: auth.tenant.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, priceCents: true, durationMin: true },
  });

  const barbers = await prisma.barber.findMany({
    where: { tenantId: auth.tenant.id, isActive: true },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true, branchId: true },
  });
  const barberOptions = barbers.map((b) => ({
    id: b.id,
    name: b.displayName,
    branchId: b.branchId,
  }));

  const defaultBranchId =
    params.sede && branches.some((b) => b.id === params.sede)
      ? params.sede
      : branches[0].id;
  const defaultDate = /^\d{4}-\d{2}-\d{2}$/.test(params.fecha ?? "")
    ? (params.fecha as string)
    : todayLima();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Nueva reserva
        </h1>
        <Link href="/agenda" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
          ← Volver
        </Link>
      </header>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <NewAppointmentForm
          branches={branches}
          services={services}
          barbers={barberOptions}
          defaultBranchId={defaultBranchId}
          defaultDate={defaultDate}
        />
      </div>
      <p className="text-xs text-zinc-500">
        El sistema valida la disponibilidad real del barbero al guardar. Si el
        horario se ocupa mientras llenabas el formulario, te avisará.
      </p>
    </div>
  );
}
