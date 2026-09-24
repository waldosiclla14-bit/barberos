"use client";

import { useActionState } from "react";
import { createBranchAction, type FormState } from "@/app/actions/branches";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: FormState = {};

export function CreateBranchForm() {
  const [state, formAction, isPending] = useActionState(
    createBranchAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="name">Nombre de la sede</Label>
        <Input id="name" name="name" required minLength={2} maxLength={60} placeholder="Miraflores" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="address">Dirección (opcional)</Label>
          <Input id="address" name="address" maxLength={160} placeholder="Av. Arequipa 123" />
        </div>
        <div>
          <Label htmlFor="phone">Teléfono (opcional)</Label>
          <Input id="phone" name="phone" inputMode="tel" placeholder="987654321" />
        </div>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-green-700">Sede creada con horario por defecto.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creando…" : "Crear sede"}
      </Button>
    </form>
  );
}
