import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Plataforma",
};

/** Área global del SUPER ADMIN. El panel completo llega en fase SaaS. */
export default async function PlataformaPage() {
  const auth = await requireUser();
  if (auth.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-zinc-900">Panel de plataforma</h1>
        <p className="mt-2 text-sm text-zinc-600">
          La administración global (tenants, suscripciones y métricas SaaS)
          estará disponible en una fase posterior.
        </p>
      </div>
    </main>
  );
}
