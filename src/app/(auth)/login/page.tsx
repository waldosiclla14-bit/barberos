import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-(--accent-bright)">
          BARBEROS
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-wide text-white">
          Bienvenido de nuevo
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Ingresa a tu barbería en BARBEROS.
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
        <LoginForm />
      </div>
    </>
  );
}