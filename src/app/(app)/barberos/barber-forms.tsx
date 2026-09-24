"use client";

import { useActionState } from "react";
import {
  createBarberAction,
  updateBarberAction,
  setBarberScheduleAction,
  type FormState,
} from "@/app/actions/barbers";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: FormState = {};

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function CreateBarberForm({
  branches,
}: {
  branches: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    createBarberAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="displayName">Nombre del barbero</Label>
        <Input id="displayName" name="displayName" required minLength={2} maxLength={60} placeholder="Carlos Sánchez" />
      </div>
      <div>
        <Label htmlFor="branchId">Sede</Label>
        <select
          id="branchId"
          name="branchId"
          required
          className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="specialties">Especialidades (opcional)</Label>
        <Input id="specialties" name="specialties" maxLength={160} placeholder="Fades, barba, diseños" />
      </div>

      <fieldset className="rounded-lg border border-zinc-200 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Acceso a la app (opcional)
        </legend>
        <label className="mb-2 flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="wantsAccess" className="h-4 w-4" />
          Crear cuenta para este barbero
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="email" type="email" placeholder="barbero@correo.com" />
          <Input name="password" type="password" placeholder="Contraseña (mín. 8)" />
        </div>
      </fieldset>

      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-green-700">Barbero creado.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creando…" : "Crear barbero"}
      </Button>
    </form>
  );
}

interface ScheduleDay {
  weekday: number;
  start: string; // HH:mm o ""
  end: string;
}

export function BarberScheduleForm({
  barberId,
  schedules,
}: {
  barberId: string;
  schedules: ScheduleDay[];
}) {
  const [state, formAction, isPending] = useActionState(
    setBarberScheduleAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="barberId" value={barberId} />
      {schedules.map((day) => (
        <div key={day.weekday} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="w-12 font-medium text-zinc-700">{DAYS[day.weekday]}</span>
          <Input
            type="time"
            name={`start-${day.weekday}`}
            defaultValue={day.start}
            aria-label={`Inicio ${DAYS[day.weekday]}`}
            className="h-9 w-32"
          />
          <span className="text-zinc-400">–</span>
          <Input
            type="time"
            name={`end-${day.weekday}`}
            defaultValue={day.end}
            aria-label={`Fin ${DAYS[day.weekday]}`}
            className="h-9 w-32"
          />
          {!day.start && !day.end && (
            <span className="text-xs text-zinc-400">(libre)</span>
          )}
        </div>
      ))}
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-green-700">Horario guardado.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar horario"}
      </Button>
    </form>
  );
}

export function EditBarberForm({
  barber,
}: {
  barber: { id: string; displayName: string; specialties: string | null; isActive: boolean };
}) {
  const [state, formAction, isPending] = useActionState(
    updateBarberAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="barberId" value={barber.id} />
      <div>
        <Label htmlFor="displayName2">Nombre</Label>
        <Input id="displayName2" name="displayName" defaultValue={barber.displayName} required minLength={2} maxLength={60} />
      </div>
      <div>
        <Label htmlFor="specialties2">Especialidades</Label>
        <Input id="specialties2" name="specialties" defaultValue={barber.specialties ?? ""} maxLength={160} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <input type="checkbox" name="isActive" defaultChecked={barber.isActive} className="h-4 w-4" />
        Activo
      </label>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-green-700">Cambios guardados.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
