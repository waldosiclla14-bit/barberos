import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { minutesToHHmm } from "@/lib/scheduling/time";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { BranchHoursForm, EditBranchForm } from "./edit-forms";

export const metadata: Metadata = {
  title: "Editar sede",
};

export default async function EditarSedePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePermission("branches:manage");
  const { id } = await params;

  const branch = await prisma.branch.findFirst({
    where: { id, tenantId: auth.tenant.id },
    include: { branchSchedules: { orderBy: { weekday: "asc" } } },
  });
  if (!branch) notFound();

  // Completar los 7 días
  const schedules = Array.from({ length: 7 }, (_, weekday) => {
    const found = branch.branchSchedules.find((s) => s.weekday === weekday);
    return {
      weekday,
      isClosed: found?.isClosed ?? true,
      open: found ? minutesToHHmm(found.openMin) : "09:00",
      close: found ? minutesToHHmm(found.closeMin) : "19:00",
    };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {branch.name}
        </h1>
        <Link href="/sedes" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
          ← Sedes
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la sede</CardTitle>
          </CardHeader>
          <CardBody>
            <EditBranchForm
              branch={{
                id: branch.id,
                name: branch.name,
                address: branch.address,
                phone: branch.phone,
                isActive: branch.isActive,
              }}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horario semanal</CardTitle>
          </CardHeader>
          <CardBody>
            <BranchHoursForm branchId={branch.id} schedules={schedules} />
            <p className="mt-3 text-xs text-zinc-500">
              Los barberos solo pueden atender dentro del horario de la sede.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
