"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email" className="text-zinc-300">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          variant="dark"
          placeholder="tu@correo.com"
        />
      </div>
      <div>
        <Label htmlFor="password" className="text-zinc-300">
          Contraseña
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          variant="dark"
          placeholder="••••••••"
        />
      </div>
      <FieldError>{state.error}</FieldError>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Ingresando…" : "Iniciar sesión"}
      </Button>
      <p className="text-center text-sm text-zinc-400">
        ¿No tienes cuenta?{" "}
        <Link href="/registrar" className="font-semibold text-(--accent-bright) hover:underline">
          Crea tu barbería
        </Link>
      </p>
    </form>
  );
}
