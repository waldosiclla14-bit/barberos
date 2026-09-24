"use client";

import { useActionState } from "react";
import { setBarberServicesAction } from "@/app/actions/services";
import type { FormState as ServiceFormState } from "@/app/actions/services";
import {
  createTimeOffAction,
  type FormState,
} from "@/app/actions/barbers";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: FormState = {};
const initialServiceState: ServiceFormState = {};

export function BarberServicesForm({
  barberId,
  services,
}: {
  barberId: string;
  services: { id: string; name: string; assigned: boolean }[];
}) {
  const [state, formAction, isPending] = useActionState(
    setBarberServicesAction,
    initialServiceState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="barberId" value={barberId} />
      <div className="grid max-h-64 gap-1.5 overflow-y-auto sm:grid-cols-2">
        {services.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="serviceIds"
              value={s.id}
              defaultChecked={s.assigned}
              className="h-4 w-4"
            />
            {s.name}
          </label>
        ))}
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-green-700">Servicios actualizados.</p>}
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar servicios"}
      </Button>
    </form>
  );
}

export function TimeOffForm({
  barberId,
  defaultDate,
}: {
  barberId: string;
  defaultDate: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createTimeOffAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="scope" value="barber" />
      <input type="hidden" name="barberId" value={barberId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="startDate">Desde</Label>
          <Input id="startDate" name="startDate" type="date" defaultValue={defaultDate} required />
        </div>
        <div>
          <Label htmlFor="startTime">Hora inicio</Label>
          <Input id="startTime" name="startTime" type="time" defaultValue="00:00" required />
        </div>
        <div>
          <Label htmlFor="endDate">Hasta</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={defaultDate} required />
        </div>
        <div>
          <Label htmlFor="endTime">Hora fin</Label>
          <Input id="endTime" name="endTime" type="time" defaultValue="23:45" required />
        </div>
      </div>
      <div>
        <Label htmlFor="reason">Motivo (opcional)</Label>
        <Input id="reason" name="reason" maxLength={140} placeholder="Vacaciones, descanso…" />
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-green-700">Bloqueo registrado.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : "Agregar bloqueo"}
      </Button>
    </form>
  );
}
