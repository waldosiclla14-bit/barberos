import type { Metadata } from "next";
import Link from "next/link";
import { DemoForm } from "./demo-form";

export const metadata: Metadata = {
  title: "Demo",
  description:
    "Prueba BARBEROS con datos de ejemplo: agenda, clientes, ventas y caja.",
};

export default function DemoPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-(--accent-bright)">
          BARBEROS
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-wide text-white">
          Prueba la demo
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Explora una barbería de ejemplo con agenda, clientes, ventas y caja.
          Sin registro.
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
        <DemoForm />
        <p className="mt-4 text-center text-sm text-zinc-400">
          ¿Te gustó?{" "}
          <Link href="/registrar" className="font-semibold text-(--accent-bright) hover:underline">
            Crea tu barbería
          </Link>
        </p>
      </div>
    </>
  );
}
