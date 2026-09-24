import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Bienvenido de nuevo
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Ingresa a tu barbería en BARBEROS.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <LoginForm />
      </div>
    </>
  );
}
