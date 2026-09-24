import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Reservas",
    desc: "Agenda por sede y barbero, sin dobles reservas ni horarios falsos.",
  },
  {
    title: "Clientes",
    desc: "Historial, preferencias y valor de cada cliente en su perfil.",
  },
  {
    title: "Barberos",
    desc: "Horarios, vacaciones, comisiones y productividad real.",
  },
  {
    title: "Caja y ventas",
    desc: "Apertura, cierre, Yape/Plin/efectivo y control de diferencias.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold tracking-tight">BARBEROS</span>
        <nav className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost">Iniciar sesión</Button>
          </Link>
          <Link href="/registrar">
            <Button>Crear mi barbería</Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <p className="mb-4 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
          El sistema operativo para barberías
        </p>
        <h1 className="max-w-2xl text-balance text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
          Tu barbería.
          <br />
          Bajo control.
        </h1>
        <p className="mt-6 max-w-xl text-pretty text-lg text-zinc-600">
          Gestiona reservas, clientes, barberos, caja y ventas desde un solo
          lugar. Deja de administrar tu barbería por WhatsApp.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/registrar">
            <Button className="w-full sm:w-auto">Crear mi barbería</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" className="w-full sm:w-auto">
              Ver demo
            </Button>
          </Link>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title}>
              <h2 className="text-sm font-semibold text-zinc-900">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-200">
        <div className="mx-auto w-full max-w-6xl px-6 py-6 text-xs text-zinc-500">
          © {new Date().getFullYear()} BARBEROS · Lima, Perú · Moneda S/ (PEN)
        </div>
      </footer>
    </main>
  );
}
