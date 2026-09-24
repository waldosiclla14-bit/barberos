import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateBarberForm } from "./barber-forms";

export const metadata: Metadata = {
  title: "Barberos",
};

export default async function BarberosPage() {
  const auth = await requirePermission("barbers:view");

  if (!hasPermission(auth.user.role, "barbers:manage")) {
    // BARBER ve lista simple de su sede
    const myBarbers = await prisma.barber.findMany({
      where: { tenantId: auth.tenant.id, isActive: true },
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        displayName: true,
        specialties: true,
        branch: { select: { name: true } },
      },
    });
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Equipo</h1>
        <Card>
          <CardBody className="px-0 py-0">
            <ul className="divide-y divide-zinc-100">
              {myBarbers.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-5 py-3.5">
                  <span className="font-semibold text-zinc-900">{b.displayName}</span>
                  <span className="text-xs text-zinc-500">{b.branch.name}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    );
  }

  const [branches, barbers] = await Promise.all([
    prisma.branch.findMany({
      where: { tenantId: auth.tenant.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.barber.findMany({
      where: { tenantId: auth.tenant.id },
      orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
      select: {
        id: true,
        displayName: true,
        specialties: true,
        isActive: true,
        branch: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Barberos
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Tu equipo por sede.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardBody className="px-0 py-0">
            {barbers.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">
                Todavía no tienes barberos. Crea el primero aquí al costado.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {barbers.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <Link
                        href={`/barberos/${b.id}`}
                        className="truncate font-semibold text-zinc-900 hover:underline"
                      >
                        {b.displayName}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {b.branch.name}
                        {b.specialties ? ` · ${b.specialties}` : ""}
                      </p>
                    </div>
                    {!b.isActive && (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
                        Inactivo
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Nuevo barbero</CardTitle>
          </CardHeader>
          <CardBody>
            {branches.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Primero{" "}
                <Link href="/sedes" className="font-semibold underline">
                  crea una sede
                </Link>
                .
              </p>
            ) : (
              <CreateBarberForm branches={branches} />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
