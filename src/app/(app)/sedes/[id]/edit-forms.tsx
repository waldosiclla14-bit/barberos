"use client";

import { useActionState } from "react";
import {
  setBranchHoursAction,
  updateBranchAction,
  type FormState,
} from "@/app/actions/branches";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: FormState = {};

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface DaySchedule {
  weekday: number;
  isClosed: boolean;
  open: string; // HH:mm
  close: string;
}

export function BranchHoursForm({
  branchId,
  schedules,
}: {
  branchId: string;
  schedules: DaySchedule[];
}) {
  const [state, formAction, isPending] = useActionState(
    setBranchHoursAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="branchId" value={branchId} />
      {schedules.map((day) => (
        <div key={day.weekday} className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex w-28 items-center gap-2 font-medium text-zinc-700">
            <input
              type="checkbox"
              name={`closed-${day.weekday}`}
              defaultChecked={day.isClosed}
              className="h-4 w-4"
              aria-label={`${DAYS[day.weekday]} cerrado`}
            />
            {DAYS[day.weekday]}
          </label>
          <Input
            type="time"
            name={`open-${day.weekday}`}
            defaultValue={day.open}
            aria-label={`Apertura ${DAYS[day.weekday]}`}
            className="h-9 w-32"
          />
          <span className="text-zinc-400">–</span>
          <Input
            type="time"
            name={`close-${day.weekday}`}
            defaultValue={day.close}
            aria-label={`Cierre ${DAYS[day.weekday]}`}
            className="h-9 w-32"
          />
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

export function EditBranchForm({
  branch,
}: {
  branch: { id: string; name: string; address: string | null; phone: string | null; isActive: boolean };
}) {
  const [state, formAction, isPending] = useActionState(
    updateBranchAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="branchId" value={branch.id} />
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" defaultValue={branch.name} required minLength={2} maxLength={60} />
      </div>
      <div>
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" name="address" defaultValue={branch.address ?? ""} maxLength={160} />
      </div>
      <div>
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" name="phone" defaultValue={branch.phone ?? ""} inputMode="tel" maxLength={15} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={branch.isActive}
          className="h-4 w-4"
        />
        Sede activa
      </label>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-green-700">Cambios guardados.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
