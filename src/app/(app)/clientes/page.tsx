import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerForm } from "./customer-forms";

export const metadata: Metadata = {
  title: "Clientes",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const auth = await requirePermission("customers:view");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const showInactive = params.inactivos === "1";

  const [barbers, customers] = await Promise.all([
    prisma.barber.findMany({
      where: { tenantId: auth.tenant.id, isActive: true },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
    prisma.customer.findMany({
      where: {
        tenantId: auth.tenant.id,
        ...(showInactive ? {} : { isActive: true }),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { phone: { contains: q } },
                { email: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: [{ visitCount: "desc" }, { updatedAt: "desc" }],
      take: 100,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        visitCount: true,
        lastVisitAt: true,
        loyaltyPoints: true,
        isActive: true,
        preferredBarber: { select: { displayName: true } },
      },
    }),
  ]);

  const total = await prisma.customer.count({
    where: { tenantId: auth.tenant.id, isActive: true },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Clientes</h1>
        <p className="mt-1 text-sm text-zinc-600">
          CRM · {total} activos. Historial, notas y preferencias.
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <InputSearch defaultValue={q} />
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Buscar
        </button>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" name="inactivos" value="1" defaultChecked={showInactive} />
          Mostrar inactivos
        </label>
      </form>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardBody className="px-0 py-0">
            {customers.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">
                {q
                  ? "Sin resultados para tu búsqueda."
                  : "Todavía no tienes clientes. Regístralos aquí al costado o desde la agenda."}
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {customers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <Link
                        href={`/clientes/${c.id}`}
                        className="truncate font-semibold text-zinc-900 hover:underline"
                      >
                        {c.name}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {c.phone}
                        {c.email ? ` · ${c.email}` : ""}
                        {c.preferredBarber ? ` · viene con ${c.preferredBarber.displayName}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-900">
                        {c.visitCount} {c.visitCount === 1 ? "visita" : "visitas"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Última: {fmtDate(c.lastVisitAt)}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-amber-700">
                        {c.loyaltyPoints} pts
                      </p>
                      {!c.isActive && (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Registrar cliente</CardTitle>
          </CardHeader>
          <CardBody>
            <CustomerForm barbers={barbers} formId="new" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function InputSearch({ defaultValue }: { defaultValue: string }) {
  return (
    <input
      name="q"
      defaultValue={defaultValue}
      placeholder="Buscar por nombre, teléfono o email"
      className="h-11 flex-1 min-w-52 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
    />
  );
}