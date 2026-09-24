"use client";

import { useActionState } from "react";
import {
  createServiceAction,
  updateServiceAction,
  type FormState,
} from "@/app/actions/services";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

const initialState: FormState = {};

interface ServiceValues {
  id?: string;
  name: string;
  description: string | null;
  priceSoles: string;
  durationMin: number;
  isActive?: boolean;
}

export function ServiceForm({ service }: { service?: ServiceValues }) {
  const [state, formAction, isPending] = useActionState(
    service?.id ? updateServiceAction : createServiceAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      {service?.id && <input type="hidden" name="serviceId" value={service.id} />}
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" defaultValue={service?.name} required minLength={2} maxLength={60} placeholder="Corte clásico" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="price">Precio (S/)</Label>
          <Input id="price" name="price" defaultValue={service?.priceSoles ?? ""} required inputMode="decimal" pattern="\d{1,4}(\.\d{1,2})?" placeholder="40" />
        </div>
        <div>
          <Label htmlFor="durationMin">Duración (min)</Label>
          <Input id="durationMin" name="durationMin" type="number" min={5} max={480} step={5} defaultValue={service?.durationMin ?? 30} required />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea id="description" name="description" maxLength={300} defaultValue={service?.description ?? ""} />
      </div>
      {service?.id && (
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input type="checkbox" name="isActive" defaultChecked={service.isActive ?? true} className="h-4 w-4" />
          Activo
        </label>
      )}
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-green-700">Guardado.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : service?.id ? "Guardar cambios" : "Crear servicio"}
      </Button>
    </form>
  );
}
