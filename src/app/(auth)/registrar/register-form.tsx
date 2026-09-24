"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="businessName" className="text-zinc-300">
          Nombre de tu barbería
        </Label>
        <Input
          id="businessName"
          name="businessName"
          required
          minLength={3}
          maxLength={80}
          variant="dark"
          placeholder="Barbería Alpha"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ownerName" className="text-zinc-300">
            Tu nombre
          </Label>
          <Input
            id="ownerName"
            name="ownerName"
            required
            minLength={3}
            maxLength={80}
            autoComplete="name"
            variant="dark"
            placeholder="Carlos Ramírez"
          />
        </div>
        <div>
          <Label htmlFor="phone" className="text-zinc-300">
            Teléfono (opcional)
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            variant="dark"
            placeholder="987654321"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email" className="text-zinc-300">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
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
          required
          minLength={8}
          autoComplete="new-password"
          variant="dark"
          placeholder="Mínimo 8 caracteres"
        />
      </div>
      <FieldError className="text-red-400">{state.error}</FieldError>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creando barbería…" : "Crear mi barbería"}
      </Button>
      <p className="text-center text-sm text-zinc-400">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-(--accent-bright) hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}