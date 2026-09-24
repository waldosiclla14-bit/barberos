import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { logoutAction } from "@/app/actions/auth";
import { ROLE_LABELS, type Role } from "@/lib/auth/rbac";
import { AppNav, type NavItem } from "@/components/app-nav";
import { themeFor } from "@/lib/themes";

// FASE 4: ventas (POS), caja y comisiones. FASE 5: inventario. FASE 8: IA. FASE 9: marketplace.
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/agenda", label: "Agenda" },
  { href: "/clientes", label: "Clientes" },
  { href: "/ventas", label: "Ventas" },
  { href: "/caja", label: "Caja" },
  { href: "/inventario", label: "Inventario" },
  { href: "/comisiones", label: "Comisiones" },
  { href: "/promociones", label: "Promociones" },
  { href: "/notificaciones", label: "Notificaciones" },
  { href: "/ia", label: "Asistente IA" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/sedes", label: "Sedes" },
  { href: "/servicios", label: "Servicios" },
  { href: "/barberos", label: "Barberos" },
  { href: "/configuracion", label: "Configuración" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, tenant } = await requireTenant();
  const theme = themeFor(tenant.theme);
  const themeStyle = {
    "--accent": theme.accent,
    "--accent-ink": theme.accentInk,
    "--accent-bright": theme.accentBright,
  } as CSSProperties;

  return (
    <div className="flex min-h-dvh flex-col" style={themeStyle}>
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="font-display text-lg font-semibold tracking-[0.14em] text-(--accent)">
              BARBEROS
            </span>
            <span className="hidden text-sm text-zinc-500 sm:inline">
              · {tenant.name}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-right text-xs leading-tight text-zinc-500">
              <span className="block font-semibold text-zinc-900">{user.name}</span>
              {ROLE_LABELS[user.role as Role] ?? user.role}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <AppNav items={NAV_ITEMS} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
