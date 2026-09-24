import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PosForm } from "./pos-form";

export const metadata: Metadata = {
  title: "Ventas",
};

function fmtMoney(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function VentasPage() {
  const auth = await requirePermission("sales:view");

  const [branches, services, barbers, products, customers, sales, tenantCfg] =
    await Promise.all([
    prisma.branch.findMany({
      where: { tenantId: auth.tenant.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { tenantId: auth.tenant.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, priceCents: true },
    }),
    prisma.barber.findMany({
      where: { tenantId: auth.tenant.id, isActive: true },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
    prisma.product.findMany({
      where: { tenantId: auth.tenant.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, priceCents: true, stockQty: true, branchId: true },
    }),
    prisma.customer.findMany({
      where: { tenantId: auth.tenant.id, isActive: true },
      orderBy: { loyaltyPoints: "desc" },
      take: 100,
      select: { id: true, name: true, phone: true, loyaltyPoints: true },
    }),
    prisma.sale.findMany({
      where: { tenantId: auth.tenant.id, status: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        totalCents: true,
        paymentMethod: true,
        createdAt: true,
        branch: { select: { name: true } },
        customer: { select: { name: true } },
        appointmentId: true,
        items: {
          select: { name: true, qty: true },
        },
      },
    }),
    prisma.tenant.findUnique({
      where: { id: auth.tenant.id },
      select: { pointRedeemCents: true },
    }),
  ]);

  const todayTotal = sales.reduce((acc, s) => acc + s.totalCents, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-wide text-zinc-900">Ventas</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Punto de venta (POS) y último registro.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Últimas ventas
          </p>
          <p className="text-xl font-bold text-zinc-900">{fmtMoney(todayTotal)}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Nueva venta</CardTitle>
          </CardHeader>
          <CardBody>
            {branches.length === 0 || services.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Necesitas al menos una sede y un servicio.{" "}
                <Link href="/servicios" className="font-semibold underline">
                  Configurar
                </Link>
                .
              </p>
            ) : (
              <PosForm
                branches={branches}
                services={services}
                barbers={barbers}
                products={products}
                customers={customers}
                pointRedeemCents={tenantCfg?.pointRedeemCents ?? 10}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas ventas</CardTitle>
          </CardHeader>
          <CardBody className="px-0 py-0">
            {sales.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">
                Sin ventas todavía. Usa el POS o completa citas para generarlas
                automáticamente.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {sales.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900">
                        {s.items[0]?.name ?? "Venta"}
                        {s.items.length > 1 && ` +${s.items.length - 1}`}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {s.customer?.name ?? "Cliente mostrador"} · {s.branch.name} ·{" "}
                        {fmtDateTime(s.createdAt)}
                        {s.appointmentId && " · desde cita"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-900">
                        {fmtMoney(s.totalCents)}
                      </p>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                        {s.paymentMethod}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}