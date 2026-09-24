import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { CloseCashForm, MovementForm, OpenCashForm } from "./caja-forms";

export const metadata: Metadata = {
  title: "Caja",
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

export default async function CajaPage() {
  const auth = await requirePermission("cash:manage");

  const [branches, movements, sessions] = await Promise.all([
    prisma.branch.findMany({
      where: { tenantId: auth.tenant.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.cashMovement.findMany({
      where: { tenantId: auth.tenant.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        amountCents: true,
        reason: true,
        createdAt: true,
        branch: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.cashSession.findMany({
      where: { tenantId: auth.tenant.id },
      orderBy: { openedAt: "desc" },
      take: 20,
      include: {
        branch: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Caja
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Apertura, cierre y movimientos por sede.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          {branches.map((b) => {
            const openForBranch = sessions.find(
              (s) => s.status === "OPEN" && s.branchId === b.id,
            );
            return (
              <Card key={b.id} className="self-start">
                <CardHeader>
                  <CardTitle>
                    {b.name}
                    {openForBranch ? " · caja abierta" : ""}
                  </CardTitle>
                </CardHeader>
                <CardBody className="space-y-4">
                  <OpenCashForm branchId={b.id} hasOpen={Boolean(openForBranch)} />
                  {openForBranch && (
                    <>
                      <div className="border-t border-zinc-100 pt-4">
                        <p className="mb-1 text-xs font-medium text-zinc-500">
                          Abierta: {fmtDateTime(openForBranch.openedAt)} · inicial{" "}
                          {fmtMoney(openForBranch.openingCents)}
                        </p>
                        <CloseCashForm sessionId={openForBranch.id} />
                      </div>
                      <div className="grid gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-2">
                        <MovementForm branchId={b.id} sessionId={openForBranch.id} type="IN" />
                        <MovementForm branchId={b.id} sessionId={openForBranch.id} type="OUT" />
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            );
          })}
          {branches.length === 0 && (
            <Card>
              <CardBody>
                <p className="text-sm text-zinc-500">
                  Crea una sede para operar la caja.
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Movimientos recientes</CardTitle>
            </CardHeader>
            <CardBody className="px-0 py-0">
              {movements.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">
                  Sin movimientos aún. Las ventas en efectivo se registran solas.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {movements.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-900">
                          {m.reason ?? (m.type === "IN" ? "Ingreso" : "Egreso")}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          {m.branch.name} · {m.user?.name ?? "sistema"} ·{" "}
                          {fmtDateTime(m.createdAt)}
                        </p>
                      </div>
                      <p
                        className={`text-sm font-semibold ${
                          m.type === "IN" ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {m.type === "IN" ? "+" : "−"}
                        {fmtMoney(m.amountCents)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sesiones de caja</CardTitle>
            </CardHeader>
            <CardBody className="px-0 py-0">
              <ul className="divide-y divide-zinc-100">
                {sessions.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900">
                        {s.branch.name}
                        <span className="ml-2 text-xs font-normal text-zinc-500">
                          {fmtDateTime(s.openedAt)}
                        </span>
                      </p>
                      {s.status === "CLOSED" && (
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Cierre: {fmtMoney(s.expectedCents)} · diferencia{" "}
                          {s.differenceCents !== null
                            ? s.differenceCents === 0
                              ? "0 (cuadrada)"
                              : fmtMoney(s.differenceCents)
                            : "—"}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        s.status === "OPEN"
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {s.status === "OPEN" ? "Abierta" : "Cerrada"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}