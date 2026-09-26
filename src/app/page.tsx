import type { CSSProperties } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarCheck,
  MessageCircle,
  TrendingUp,
  Scissors,
  Users,
  Wallet,
  Check,
  Star,
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

const steps: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: CalendarCheck,
    title: "1. Crea tu barbería",
    desc: "Registra tu sede, servicios, barberos y horarios en minutos. Sin tarjeta.",
  },
  {
    icon: MessageCircle,
    title: "2. Comparte tu enlace",
    desc: "Tus clientes reservan solos en tu página /reservar, sin crear cuenta.",
  },
  {
    icon: TrendingUp,
    title: "3. Cobra y crece",
    desc: "Vende en caja, controla comisiones y fideliza con puntos y promos.",
  },
];

// TODO: reemplazar con testimonios reales de clientes.
const testimonials: { quote: string; name: string; detail: string }[] = [
  {
    quote:
      "Antes perdía reservas por WhatsApp todos los días. Ahora la agenda se llena sola.",
    name: "Carlos M.",
    detail: "Barbería en Miraflores",
  },
  {
    quote:
      "La caja cuadra al centavo y las comisiones salen solas. Me ahorra horas cada semana.",
    name: "Miguel T.",
    detail: "Barbería en Surco",
  },
  {
    quote:
      "Mis clientes reservan desde el enlace sin llamarme. El no-show bajó con los recordatorios.",
    name: "Luis R.",
    detail: "Barbería en San Isidro",
  },
];

const plans: {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  href: string;
  highlight: boolean;
}[] = [
  {
    name: "Gratis",
    price: "S/ 0",
    period: "para siempre",
    desc: "Todo lo esencial para ordenar tu barbería.",
    features: [
      "Agenda por sede y barbero",
      "Reservas online sin cuenta",
      "Clientes e historial",
      "Caja y ventas en efectivo",
    ],
    cta: "Empezar gratis",
    href: "/registrar",
    highlight: false,
  },
  {
    name: "Temas premium",
    price: "S/ 9.90",
    period: "pago único",
    desc: "Viste tu panel y tu página de reservas.",
    features: [
      "4 temas: Oro, Esmeralda, Océano y Rubí",
      "Tu página de reservas con tu marca",
      "Se aplican al instante",
      "Sin suscripción",
    ],
    cta: "Ver en Marketplace",
    href: "/login",
    highlight: true,
  },
  {
    name: "Integraciones",
    price: "S/ 12",
    period: "desde /mes",
    desc: "Conecta tu barbería con el resto.",
    features: [
      "WhatsApp Cloud API (S/ 29/mes)",
      "Google Business Profile (S/ 19/mes)",
      "Meta Pixel (S/ 15/mes)",
      "Reportes PDF (S/ 12/mes)",
    ],
    cta: "Ver en Marketplace",
    href: "/login",
    highlight: false,
  },
];

// Marca global pre-tenant: el oro de BARBEROS en las superficies oscuras.
const goldStyle = {
  "--accent": "var(--gold)",
  "--accent-ink": "#1c1917",
  "--accent-bright": "var(--gold-bright)",
} as CSSProperties;

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BARBEROS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "es-PE",
    offers: { "@type": "Offer", price: "0", priceCurrency: "PEN" },
    description:
      "Gestiona reservas, clientes, barberos, caja y ventas de tu barbería desde un solo lugar.",
  };
  return (
    <main
      className="flex flex-1 flex-col bg-(--dark-bg) text-zinc-100"
      style={goldStyle}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 animate-fade-in sm:flex-row">
        <span className="font-display text-xl font-semibold tracking-[0.16em] text-(--accent-bright)">
          BARBEROS
        </span>
        <nav className="flex w-full items-center justify-center gap-2 sm:w-auto">
          <Link href="/login" className="flex-1 sm:flex-none">
            <Button variant="ghost-light" className="w-full sm:w-auto">
              Iniciar sesión
            </Button>
          </Link>
          <Link href="/registrar" className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto">Crear mi barbería</Button>
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
          <Link href="/demo">
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

      <section
        id="como-funciona"
        aria-labelledby="como-funciona-title"
        className="border-t border-white/[0.06]"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-(--accent-bright)">
            Cómo funciona
          </p>
          <h2
            id="como-funciona-title"
            className="mx-auto mt-3 max-w-2xl text-center font-display text-3xl font-semibold tracking-wide text-white sm:text-4xl"
          >
            De cero a agenda llena en tres pasos
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <s.icon
                  aria-hidden
                  className="h-6 w-6 text-(--accent-bright)"
                  strokeWidth={2}
                />
                <h3 className="mt-4 font-display text-base font-semibold uppercase tracking-wider text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="opiniones"
        aria-labelledby="opiniones-title"
        className="border-t border-white/[0.06] bg-white/[0.02]"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-(--accent-bright)">
            Opiniones
          </p>
          <h2
            id="opiniones-title"
            className="mx-auto mt-3 max-w-2xl text-center font-display text-3xl font-semibold tracking-wide text-white sm:text-4xl"
          >
            Barberos que ya dejaron el cuaderno
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure
                key={t.name}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div
                  className="flex gap-1 text-(--accent-bright)"
                  role="img"
                  aria-label="Calificación: 5 de 5 estrellas"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} aria-hidden className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-zinc-300">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold text-white">{t.name}</span>
                  <span className="block text-xs text-zinc-400">{t.detail}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section
        id="precios"
        aria-labelledby="precios-title"
        className="border-t border-white/[0.06]"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-(--accent-bright)">
            Precios
          </p>
          <h2
            id="precios-title"
            className="mx-auto mt-3 max-w-2xl text-center font-display text-3xl font-semibold tracking-wide text-white sm:text-4xl"
          >
            Empieza gratis, crece a tu ritmo
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col rounded-2xl border p-6 ${
                  p.highlight
                    ? "border-(--accent)/60 bg-white/[0.05]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
                  {p.name}
                </h3>
                <p className="mt-3">
                  <span className="font-display text-4xl font-semibold text-white">
                    {p.price}
                  </span>{" "}
                  <span className="text-sm text-zinc-400">{p.period}</span>
                </p>
                <p className="mt-2 text-sm text-zinc-400">{p.desc}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-zinc-300"
                    >
                      <Check
                        aria-hidden
                        className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-bright)"
                        strokeWidth={2.5}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={p.href} className="mt-6">
                  <Button
                    variant={p.highlight ? "primary" : "outline"}
                    className="w-full"
                  >
                    {p.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="cta-title" className="border-t border-white/[0.06] bg-white/[0.02]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-20 text-center">
          <h2
            id="cta-title"
            className="max-w-2xl font-display text-3xl font-semibold tracking-wide text-white sm:text-4xl"
          >
            Tu próxima reserva puede llegar sola
          </h2>
          <p className="mt-4 max-w-xl text-zinc-400">
            Crea tu barbería hoy y comparte tu enlace de reservas. Sin tarjeta,
            sin instalaciones.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/registrar">
              <Button className="w-full sm:w-auto">Crear mi barbería</Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" className="w-full sm:w-auto">
                Probar la demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-zinc-400 sm:flex-row">
          <span className="font-display font-semibold tracking-[0.16em] text-(--accent-bright)">
            BARBEROS
          </span>
          <nav aria-label="Enlaces del sitio" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="#como-funciona" className="transition-colors hover:text-white">
              Cómo funciona
            </Link>
            <Link href="#opiniones" className="transition-colors hover:text-white">
              Opiniones
            </Link>
            <Link href="#precios" className="transition-colors hover:text-white">
              Precios
            </Link>
            <Link href="/demo" className="transition-colors hover:text-white">
              Demo
            </Link>
            <Link href="/login" className="transition-colors hover:text-white">
              Iniciar sesión
            </Link>
          </nav>
          <span>© {new Date().getFullYear()} BARBEROS · Lima, Perú</span>
        </div>
      </footer>
    </main>
  );
}