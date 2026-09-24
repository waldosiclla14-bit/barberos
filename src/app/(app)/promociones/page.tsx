import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PromotionForm, TogglePromotion } from "./promotion-forms";

export const metadata: Metadata = {
  title: "Promociones",
};

export default async function PromocionesPage() {
  const auth = await requirePermission("promotions:view");
  const canManage = hasPermission(auth.user.role, "promotions:manage");

  const promos = await prisma.promotion.findMany({
    where: { tenantId: auth.tenant.id },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      discountPct: true,
      startsAt: true,
      endsAt: true,
      isActive: true,
    },
  });

  const now = new Date();
  const activeNow = promos.filter(
    (p) =>
      p.isActive &&
      (!p.startsAt || p.startsAt <= now) &&
      (!p.endsAt || p.endsAt >= now),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Promociones
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Ofertas vigentes para tus clientes.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Vigentes ahora
          </p>
          <p className="text-xl font-bold text-zinc-900">{activeNow.length}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Promociones</CardTitle>
          </CardHeader>
          <CardBody className="px-0 py-0">
            {promos.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">
                Crea tu primera promoción, por ejemplo una para los días de poca
                afluencia.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {promos.map((p) => {
                  const active = activeNow.some((x) => x.id === p.id);
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900">
                          {p.name}
                          <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                            {p.discountPct}% OFF
                          </span>
                        </p>
                        {p.description && (
                          <p className="mt-0.5 truncate text-xs text-zinc-500">
                            {p.description}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {[
                            p.startsAt?.toLocaleDateString("es-PE"),
                            p.endsAt?.toLocaleDateString("es-PE"),
                          ]
                            .filter(Boolean)
                            .join(" → ") || "Sin fecha límite"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            active
                              ? "bg-green-100 text-green-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {active ? "En curso" : p.isActive ? "Programada" : "Pausada"}
                        </span>
                        {canManage && (
                          <div className="mt-1">
                            <TogglePromotion id={p.id} isActive={p.isActive} />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {canManage && (
          <Card className="self-start">
            <CardHeader>
              <CardTitle>Nueva promoción</CardTitle>
            </CardHeader>
            <CardBody>
              <PromotionForm />
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}