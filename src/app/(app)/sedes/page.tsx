import type { Metadata } from "next";
import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatHHmm } from "@/lib/scheduling/time";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateBranchForm } from "./create-branch-form";

export const metadata: Metadata = {
  title: "Sedes",
};

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default async function SedesPage() {
  const auth = await requireTenant();
  const canManage = hasPermission(auth.user.role, "branches:manage");

  const branches = await prisma.branch.findMany({
    where: { tenantId: auth.tenant.id },
    orderBy: { name: "asc" },
    include: { branchSchedules: { orderBy: { weekday: "asc" } } },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Sedes</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Locales donde tu barbería atiende.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {branches.map((branch) => (
          <Card key={branch.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-zinc-900">{branch.name}</h2>
                  {branch.address && (
                    <p className="mt-0.5 text-sm text-zinc-500">{branch.address}</p>
                  )}
                </div>
                {!branch.isActive && (
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
                    Inactiva
                  </span>
                )}
              </div>

              <ul className="mt-3 space-y-1 text-xs text-zinc-600">
                {branch.branchSchedules.map((s) => (
                  <li key={s.id} className="flex justify-between tabular-nums">
                    <span>{DAYS[s.weekday]}</span>
                    <span>{s.isClosed ? "Cerrado" : `${formatHHmm(s.openMin)} – ${formatHHmm(s.closeMin)}`}</span>
                  </li>
                ))}
              </ul>

              {canManage && (
                <Link
                  href={`/sedes/${branch.id}`}
                  className="mt-3 inline-block text-sm font-semibold text-zinc-900 hover:underline"
                >
                  Editar sede y horarios →
                </Link>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Agregar sede</CardTitle>
          </CardHeader>
          <CardBody>
            <CreateBranchForm />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
