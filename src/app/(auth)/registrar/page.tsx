import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Crear barbería",
};

export default function RegisterPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Crea tu barbería
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          En 2 minutos tendrás tu negocio listo para recibir reservas.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <RegisterForm />
      </div>
    </>
  );
}
