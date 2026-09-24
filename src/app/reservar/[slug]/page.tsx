import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPEN, cn } from "@/lib/utils";
import { themeFor, type ThemeEntry } from "@/lib/themes";
import {
  getAvailability,
  MAX_ADVANCE_DAYS,
} from "@/lib/scheduling/availability";
import {
  addDaysToKey,
  todayLima,
  toLimaParts,
  formatHHmm,
} from "@/lib/scheduling/time";
import { BookingForm } from "./booking-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: tenant ? `Reservar en ${tenant.name}` : "Reservar" };
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function buildHref(
  slug: string,
  base: Record<string, string | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v) sp.set(k, v);
  }
  return `/reservar/${slug}?${sp.toString()}`;
}

export default async function ReservarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const rawSp = await searchParams;
  // Normaliza: el formulario GET de servicios envía valores repetidos
  const sp: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(rawSp)) {
    sp[k] = Array.isArray(v) ? v.filter(Boolean).join(",") : (v ?? undefined);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, allowGuestBooking: true, theme: true },
  });
  if (!tenant || !tenant.allowGuestBooking) notFound();
  const theme = themeFor(tenant.theme);

  // ---- Paso 1: sede
  const branches = await prisma.branch.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true },
  });
  if (branches.length === 0) {
    return <Empty text="Esta barbería aún no tiene sedes disponibles." />;
  }

  const branchId =
    sp.sede && branches.some((b) => b.id === sp.sede) ? sp.sede : undefined;

  if (!branchId) {
    return (
      <Shell theme={theme}
      name={tenant.name}>
        <Progress current={1} total={4} />
        <StepTitle step={1} title="Elige una sede" />
        <div className="grid gap-3">
          {branches.map((b) => (
            <Link
              key={b.id}
              href={buildHref(slug, { sede: b.id })}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-(--accent)/60 hover:shadow-md active:bg-zinc-50"
            >
              <p className="font-bold text-zinc-900">{b.name}</p>
              {b.address && (
                <p className="mt-0.5 text-sm text-zinc-500">{b.address}</p>
              )}
            </Link>
          ))}
        </div>
      </Shell>
    );
  }

  // ---- Paso 2: servicios (formulario GET sin JS)
  if (!sp.servicios) {
    return (
      <Shell theme={theme}
      name={tenant.name}>
        <Progress current={2} total={4} />
        <BackLink href={`/reservar/${slug}`} label="Cambiar sede" />
        <StepTitle step={2} title="¿Qué necesitas?" />
        <form action={`/reservar/${slug}`} method="get" className="space-y-3">
          <input type="hidden" name="sede" value={branchId} />
          {(await prisma.service.findMany({
            where: {
              tenantId: tenant.id,
              isActive: true,
              branches: { some: { branchId } },
            },
            orderBy: { name: "asc" },
            select: { id: true, name: true, priceCents: true, durationMin: true },
          })).map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-(--accent)/60 hover:shadow-md"
            >
              <input type="checkbox" name="servicios" value={s.id} className="h-5 w-5 shrink-0" />
              <span className="flex-1 font-medium text-zinc-900">{s.name}</span>
              <span className="text-right text-sm text-zinc-500">
                {s.durationMin} min
                <br />
                <strong className="text-zinc-900">{formatPEN(s.priceCents / 100)}</strong>
              </span>
            </label>
          ))}
          <button
            type="submit"
            className="w-full rounded-xl bg-(--accent) py-3.5 text-base font-bold text-(--accent-ink) transition-all duration-150 hover:brightness-110 active:scale-[0.99]"
          >
            Continuar
          </button>
        </form>
      </Shell>
    );
  }

  const serviceIds = sp.servicios.split(",").filter(Boolean);

  // ---- Paso 3: barbero
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, id: { in: serviceIds }, isActive: true },
    select: { id: true, durationMin: true, priceCents: true },
  });
  if (services.length === 0) {
    return <Empty text="Servicios no disponibles. Vuelve a empezar." backHref={`/reservar/${slug}?sede=${branchId}`} />;
  }

  const barbers = await prisma.barber.findMany({
    where: {
      tenantId: tenant.id,
      branchId,
      isActive: true,
      AND: serviceIds.map((sid) => ({ services: { some: { serviceId: sid } } })),
    },
    select: { id: true, displayName: true, specialties: true },
    orderBy: { displayName: "asc" },
  });

  if (!sp.fecha) {
    return (
      <Shell theme={theme}
      name={tenant.name}>
        <Progress current={3} total={4} />
        <BackLink href={buildHref(slug, { sede: branchId })} label="Cambiar servicios" />
        <StepTitle step={3} title="¿Con quién?" />
        <div className="grid gap-3">
          <Link
            href={buildHref(slug, { sede: branchId, servicios: sp.servicios, barbero: "any", fecha: todayLima() })}
            className="rounded-xl border-(--accent) bg-(--accent) p-4 text-(--accent-ink) shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="font-bold">Cualquier barbero disponible</p>
<p className="mt-0.5 text-sm text-(--accent-ink)/70">
                Te asignamos el primero libre
              </p>
          </Link>
          {barbers.map((b) => (
            <Link
              key={b.id}
              href={buildHref(slug, { sede: branchId, servicios: sp.servicios, barbero: b.id, fecha: todayLima() })}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-(--accent)/60 hover:shadow-md"
            >
              <p className="font-bold text-zinc-900">{b.displayName}</p>
              {b.specialties && (
                <p className="mt-0.5 text-sm text-zinc-500">{b.specialties}</p>
              )}
            </Link>
          ))}
          {barbers.length === 0 && (
            <Empty inline text="No hay barberos para esos servicios en esta sede." />
          )}
        </div>
      </Shell>
    );
  }

  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : todayLima();
  const barberoParam = sp.barbero ?? "any";

  if (!sp.hora) {
    let availability;
    try {
      availability = await getAvailability({
        tenantId: tenant.id,
        branchId,
        dateKey: fecha,
        serviceIds,
        barberId: barberoParam === "any" ? null : barberoParam,
      });
    } catch {
      availability = null;
    }

    const days = Array.from({ length: 14 }, (_, i) => addDaysToKey(todayLima(), i));

    return (
      <Shell theme={theme}
      name={tenant.name}>
        <Progress current={4} total={4} />
        <BackLink href={buildHref(slug, { sede: branchId, servicios: sp.servicios })} label="Cambiar barbero" />

        <nav aria-label="Días" className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => {
            const dt = new Date(`${d}T12:00:00`);
            const wd = DAY_NAMES[dt.getDay()];
            const dayNum = Number(d.slice(8));
            return (
              <Link
                key={d}
                href={buildHref(slug, { sede: branchId, servicios: sp.servicios, barbero: barberoParam, fecha: d })}
                className={cn(
                  "flex w-16 shrink-0 flex-col items-center rounded-xl border py-2.5",
                  d === fecha
                    ? "border-(--accent) bg-(--accent) text-(--accent-ink) shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-(--accent)/50",
                )}
              >
                <span className="text-[11px] uppercase">{wd}</span>
                <span className="text-lg font-bold tabular-nums">{dayNum}</span>
              </Link>
            );
          })}
        </nav>

        <StepTitle step={4} title="Elige la hora" />
        {!availability || availability.anyBarber.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            {availability?.notice ?? "Sin disponibilidad este día."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {availability.anyBarber.map((slot) => {
              const parts = toLimaParts(new Date(slot.start));
              return (
                <Link
                  key={slot.start}
                  href={buildHref(slug, {
                    sede: branchId,
                    servicios: sp.servicios,
                    barbero: barberoParam,
                    fecha,
                    hora: formatHHmm(parts.minutes),
                  })}
                  className="rounded-xl border border-zinc-200 bg-white py-3 text-center font-bold tabular-nums text-zinc-900 transition-all duration-150 hover:border-(--accent) hover:text-(--accent) active:scale-[0.98]"
                >
                  {formatHHmm(parts.minutes)}
                </Link>
              );
            })}
          </div>
        )}

        {availability && availability.anyBarber.length > 0 && (
          <p className="mt-4 text-xs text-zinc-400">
            Duración total: {availability.totalDurationMin} min · Máximo{" "}
            {MAX_ADVANCE_DAYS} días de anticipación.
          </p>
        )}
      </Shell>
    );
  }

  // ---- Paso final: datos + confirmación
  const hora = /^\d{2}:\d{2}$/.test(sp.hora ?? "") ? (sp.hora as string) : undefined;
  if (!hora) {
    return <Empty text="Horario inválido." backHref={`/reservar/${slug}?sede=${branchId}`} />;
  }

  const chosenServices = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { name: true, priceCents: true, durationMin: true },
  });
  const totalCents = chosenServices.reduce((a, s) => a + s.priceCents, 0);
  const branchName = branches.find((b) => b.id === branchId)?.name ?? "";
  const barberName =
    barberoParam === "any"
      ? "Primer barbero disponible"
      : (barbers.find((b) => b.id === barberoParam)?.displayName ?? "");

  return (
    <Shell theme={theme}
      name={tenant.name}>
      <BackLink
        href={buildHref(slug, { sede: branchId, servicios: sp.servicios, barbero: barberoParam, fecha })}
        label="Cambiar hora"
      />
      <div className="border-(--accent) mb-4 rounded-xl bg-(--accent) p-4 text-(--accent-ink)">
        <p className="text-xs uppercase tracking-wide text-(--accent-ink)/60">Tu reserva</p>
        <p className="mt-1 text-lg font-bold">
          {new Date(`${fecha}T12:00:00`).toLocaleDateString("es-PE", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}{" "}
          · {hora}
        </p>
        <ul className="mt-2 space-y-0.5 text-sm text-(--accent-ink)/70">
          {chosenServices.map((s) => (
            <li key={s.name}>
              {s.name} — {s.durationMin} min
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm font-semibold">
          Total aprox.: {formatPEN(totalCents / 100)} · {barberName} · {branchName}
        </p>
      </div>

      <BookingForm
        slug={slug}
        branchId={branchId}
        barberId={barberoParam}
        serviceIds={serviceIds}
        date={fecha}
        time={hora}
      />
      <p className="mt-3 text-center text-xs text-zinc-400">
        No necesitas cuenta para reservar.
      </p>
    </Shell>
  );
}

// ---------- helpers UI ----------

function Shell({
  name,
  theme,
  children,
}: {
  name: string;
  theme: ThemeEntry;
  children: ReactNode;
}) {
  const style = {
    "--accent": theme.accent,
    "--accent-ink": theme.accentInk,
    "--accent-bright": theme.accentBright,
  } as CSSProperties;
  return (
    <main
      className="mx-auto w-full max-w-md flex-1 px-4 py-8 animate-fade-in"
      style={style}
    >
      <header className="mb-6 text-center animate-fade-up">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-(--accent)">
          BARBEROS
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-wide text-(--accent)">
          {name}
        </h1>
      </header>
      <div className="space-y-4">{children}</div>
    </main>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      className="flex gap-1.5"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full",
            i < current ? "bg-(--accent)" : "bg-zinc-200",
          )}
        />
      ))}
    </div>
  );
}

function StepTitle({ step, title }: { step: number; title: string }) {
  return (
    <h2 className="font-display text-xl font-semibold uppercase tracking-wide text-zinc-900">
      <span className="text-(--accent)">{step}.</span> {title}
    </h2>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-block text-sm font-medium text-zinc-500 transition-colors hover:text-(--accent)"
    >
      ← {label}
    </Link>
  );
}

function Empty({
  text,
  backHref,
  inline,
}: {
  text: string;
  backHref?: string;
  inline?: boolean;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-16 text-center">
      <p className="text-sm text-zinc-600">{text}</p>
      {backHref && (
        <Link href={backHref} className="mt-4 text-sm font-semibold text-(--accent) underline">
          Volver
        </Link>
      )}
      {!backHref && !inline && (
        <Link href="/" className="mt-4 text-sm font-semibold text-(--accent) underline">
          Ir al inicio
        </Link>
      )}
    </main>
  );
}

