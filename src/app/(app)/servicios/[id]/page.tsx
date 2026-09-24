import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = {
  title: "Editar servicio",
};

export default async function EditarServicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePermission("services:manage");
  const { id } = await params;

  const service = await prisma.service.findFirst({
    where: { id, tenantId: auth.tenant.id },
  });
  if (!service) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Editar servicio
        </h1>
        <Link href="/servicios" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
          ← Servicios
        </Link>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{service.name}</CardTitle>
        </CardHeader>
        <CardBody>
          <ServiceForm
            service={{
              id: service.id,
              name: service.name,
              description: service.description,
              priceSoles: (service.priceCents / 100).toFixed(2).replace(/\.00$/, ""),
              durationMin: service.durationMin,
              isActive: service.isActive,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
