import type { CSSProperties } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Scissors,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: CalendarDays,
    title: "Reservas",
    desc: "Agenda por sede y barbero, sin dobles reservas ni horarios falsos.",
  },
  {
    icon: Users,
    title: "Clientes",
    desc: "Historial, preferencias y valor de cada cliente en su perfil.",
  },
  {
    icon: Scissors,
    title: "Barberos",
    desc: "Horarios, vacaciones, comisiones y productividad real.",
  },
  {
    icon: Wallet,
    title: "Caja y ventas",
    desc: "Apertura, cierre, Yape/Plin/efectivo y control de diferencias.",
  },
];

// Marca global pre-tenant: el oro de BARBEROS en las superficies oscuras.
const goldStyle = {
  "--accent": "var(--gold)",
  "--accent-ink": "#1c1917",
  "--accent-bright": "var(--gold-bright)",
} as CSSProperties;

export default function LandingPage() {
  return (
    <main
      className="flex flex-1 flex-col bg-[--dark-bg] text-zinc-100"
      style={goldStyle}
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 animate-fade-in">
        <span className="font-display text-xl font-semibold tracking-[0.16em] text-(--accent-bright)">
          BARBEROS
        </span>
        <nav className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost-light">Iniciar sesión</Button>
          </Link>
          <Link href="/registrar">
            <Button>Crear mi barbería</Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="mb-6 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-zinc-300 animate-fade-up">
          El sistema operativo para barberías
        </p>
        <h1 className="max-w-3xl text-balance font-display text-5xl font-semibold leading-[1.05] tracking-wide text-white sm:text-7xl animate-fade-up">
          Tu barbería.
          <br />
          <span className="bg-gradient-to-b from-(--accent-bright) to-(--accent) bg-clip-text text-transparent">
            Bajo control.
          </span>
        </h1>
        <p className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-zinc-400 animate-fade-up">
          Gestiona reservas, clientes, barberos, caja y ventas desde un solo
          lugar. Deja de administrar tu barbería por WhatsApp.
        </p>
        <div
          className="mt-10 flex flex-col gap-3 sm:flex-row animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          <Link href="/registrar">
            <Button className="w-full sm:w-auto">Crear mi barbería</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full sm:w-auto">
              Ver demo
            </Button>
          </Link>
        </div>
      </section>

      <section className="border-t border-white/[0.06] bg-white/[0.02]">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-(--accent)/50 hover:bg-white/[0.05]"
            >
              <f.icon
                aria-hidden
                className="h-5 w-5 text-(--accent-bright)"
                strokeWidth={2}
              />
              <h2 className="mt-4 font-display text-base font-semibold uppercase tracking-wider text-white">
                {f.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-zinc-500">
          <span>© {new Date().getFullYear()} BARBEROS · Lima, Perú · Moneda S/ (PEN)</span>
          <span className="uppercase tracking-[0.2em] text-(--accent-bright)/80">
            Reservas · Clientes · Caja · Comisiones
          </span>
        </div>
      </footer>
    </main>
  );
}