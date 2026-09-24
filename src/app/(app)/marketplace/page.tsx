import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { INTEGRATIONS, THEMES, parseIntegrations } from "@/lib/themes";
import { Card, CardBody } from "@/components/ui/card";
import { InstallThemeButton, ToggleIntegration } from "./marketplace-controls";

export const metadata: Metadata = {
  title: "Marketplace",
};

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const auth = await requirePermission("settings:view");
  const canManage = hasPermission(auth.user.role, "settings:manage");

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.tenant.id },
    select: { theme: true, integrations: true },
  });
  const installed = parseIntegrations(tenant?.integrations ?? "[]");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-wide text-zinc-900">
          Marketplace
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Temas e integraciones para {auth.tenant.name}. (Demo: la instalación es
          local y se audita; el pago es simulado.)
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Temas</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Cambia el color de marca de tu panel y de la página pública de reservas.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((t) => {
            const current = tenant?.theme === t.code;
            const swatch = {
              "--accent": t.accent,
              "--accent-ink": t.accentInk,
            } as CSSProperties;
            return (
              <Card key={t.code}>
                <CardBody className="space-y-3">
                  <div
                    className="flex h-10 items-center gap-2 rounded-lg px-3"
                    style={swatch}
                  >
                    <span
                      className="h-4 w-4 rounded-full ring-2 ring-white/40"
                      style={{ background: t.accent }}
                    />
                    <span className="text-(--accent-ink) font-semibold">
                      {t.name} Preview
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">{t.name}</p>
                    <p className="text-sm text-zinc-600">{t.description}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-zinc-700">
                      {t.price}
                    </span>
                    <InstallThemeButton
                      code={t.code}
                      current={current}
                      disabled={!canManage}
                    />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Integraciones</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Conecta tu barbería con canales externos.
        </p>
        <div className="mt-4 space-y-3">
          {INTEGRATIONS.map((i) => {
            const active = installed.includes(i.code);
            return (
              <Card key={i.code}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-zinc-900">{i.name}</p>
                      {active && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                          Activa
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-600">{i.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-700">
                      {i.price}
                    </span>
                    <ToggleIntegration
                      code={i.code}
                      installed={active}
                      disabled={!canManage}
                    />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}