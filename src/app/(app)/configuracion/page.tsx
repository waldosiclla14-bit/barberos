import type { Metadata } from "next";
import { requireTenant } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { BusinessForm } from "./business-form";

export const metadata: Metadata = {
  title: "Configuración",
};

export default async function ConfiguracionPage() {
  const { tenant, user } = await requireTenant();
  const canManage = hasPermission(user.role, "settings:manage");

  const info = [
    { label: "Moneda", value: `${tenant.currency} (S/)` },
    { label: "Zona horaria", value: tenant.timezone },
    { label: "Plan", value: tenant.plan },
    { label: "Estado", value: tenant.status },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Datos generales de tu negocio.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos del negocio</CardTitle>
          </CardHeader>
          <CardBody>
            <BusinessForm
              initialName={tenant.name}
              canManage={canManage}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferencias regionales</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-4">
              {info.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-zinc-900">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
