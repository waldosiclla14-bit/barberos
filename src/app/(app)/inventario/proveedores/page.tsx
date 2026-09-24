import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierForm } from "../inventory-forms";

export const metadata: Metadata = {
  title: "Proveedores",
};

export default async function ProveedoresPage() {
  const auth = await requirePermission("inventory:view");

  const suppliers = await prisma.supplier.findMany({
    where: { tenantId: auth.tenant.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true, email: true, isActive: true },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-wide text-zinc-900">
          Proveedores
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Registro de proveedores para compras de insumos.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Proveedores registrados</CardTitle>
          </CardHeader>
          <CardBody className="px-0 py-0">
            {suppliers.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">
                Sin proveedores todavía.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {suppliers.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900">{s.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {[s.phone, s.email].filter(Boolean).join(" · ") || "Sin contacto"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        s.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {s.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Nuevo proveedor</CardTitle>
          </CardHeader>
          <CardBody>
            <SupplierForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}