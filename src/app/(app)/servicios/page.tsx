import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatPEN } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceForm } from "./service-form";

export const metadata: Metadata = {
  title: "Servicios",
};

export default async function ServiciosPage() {
  const auth = await requirePermission("services:view");

  const services = await prisma.service.findMany({
    where: { tenantId: auth.tenant.id },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      priceCents: true,
      durationMin: true,
      isActive: true,
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Servicios
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Catálogo disponible en todas tus sedes activas.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardBody className="px-0 py-0">
            {services.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">
                Todavía no tienes servicios. Crea el primero aquí al costado.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <Link
                        href={`/servicios/${s.id}`}
                        className="truncate font-semibold text-zinc-900 hover:underline"
                      >
                        {s.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {s.durationMin} min
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!s.isActive && (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
                          Inactivo
                        </span>
                      )}
                      <span className="font-bold tabular-nums text-zinc-900">
                        {formatPEN(s.priceCents / 100)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Nuevo servicio</CardTitle>
          </CardHeader>
          <CardBody>
            <ServiceForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
