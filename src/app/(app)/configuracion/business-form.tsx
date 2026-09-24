"use client";

import { useActionState } from "react";
import {
  updateBusinessAction,
  type BusinessFormState,
} from "@/app/actions/business";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";

const initialState: BusinessFormState = {};

export function BusinessForm({
  initialName,
  canManage,
}: {
  initialName: string;
  canManage: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updateBusinessAction,
    initialState,
  );

  if (!canManage) {
    return (
      <p className="text-sm text-zinc-500">
        Solo el dueño puede modificar estos datos.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre del negocio</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initialName}
          required
          minLength={3}
          maxLength={80}
        />
      </div>
      <FieldError>{state.error}</FieldError>
      {state.success && (
        <p role="status" className="text-sm font-medium text-green-700">
          Cambios guardados.
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
