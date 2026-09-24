import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { commissionsForRange } from "@/lib/sales";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Comisiones",
};

function fmtMoney(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

export default async function ComisionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requirePermission("reports:view");
  const params = await searchParams;

  const fromRaw = typeof params.desde === "string" ? params.desde : "";
  const toRaw = typeof params.hasta === "string" ? params.hasta : "";

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 86400000);
  const from = fromRaw ? new Date(`${fromRaw}T00:00:00Z`) : defaultFrom;
  const to = toRaw ? new Date(`${toRaw}T23:59:59Z`) : new Date(now);

  const [commissions, totals] = await Promise.all([
    commissionsForRange(auth.tenant.id, from, to),
    prisma.sale.aggregate({
      where: {
        tenantId: auth.tenant.id,
        status: "PAID",
        createdAt: { gte: from, lt: to },
      },
      _sum: { totalCents: true },
    }),
  ]);

  const totalComm = commissions.reduce((a, c) => a + c.commissionCents, 0);
  const salesTotal = totals._sum.totalCents ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Comisiones
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Generadas por los servicios realizados por cada barbero.
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="desde" className="mb-1 block text-sm font-medium text-zinc-700">
            Desde
          </label>
          <input
            type="date"
            id="desde"
            name="desde"
            defaultValue={from.toISOString().slice(0, 10)}
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="hasta" className="mb-1 block text-sm font-medium text-zinc-700">
            Hasta
          </label>
          <input
            type="date"
            id="hasta"
            name="hasta"
            defaultValue={to.toISOString().slice(0, 10)}
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Filtrar
        </button>
      </form>

      <section aria-label="Totales" className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Ventas del periodo
            </p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {fmtMoney(salesTotal)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Comisiones totales
            </p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {fmtMoney(totalComm)}
            </p>
            {salesTotal > 0 && (
              <p className="mt-1 text-xs text-zinc-500">
                {Math.round((totalComm / salesTotal) * 100)}% sobre ventas
              </p>
            )}
          </CardBody>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Por barbero</CardTitle>
        </CardHeader>
        <CardBody className="px-0 py-0">
          {commissions.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">
              Sin comisiones en este periodo.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {commissions.map((c) => (
                <li key={c.barberName} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    {c.barberId ? (
                      <Link
                        href={`/barberos/${c.barberId}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {c.barberName}
                      </Link>
                    ) : (
                      <span className="font-medium text-zinc-900">{c.barberName}</span>
                    )}
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Base: {fmtMoney(c.baseCents)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-zinc-900">
                    {fmtMoney(c.commissionCents)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}