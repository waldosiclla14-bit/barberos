"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createInternalAppointmentAction,
  type FormState,
} from "@/app/actions/appointments";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { formatPEN } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
}

interface ServiceOption extends Option {
  priceCents: number;
  durationMin: number;
}

const initialState: FormState = {};

export function NewAppointmentForm({
  branches,
  services,
  barbers,
  defaultBranchId,
  defaultDate,
}: {
  branches: Option[];
  services: ServiceOption[];
  barbers: (Option & { branchId: string })[];
  defaultBranchId: string;
  defaultDate: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createInternalAppointmentAction,
    initialState,
  );
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const branchBarbers = useMemo(
    () => barbers.filter((b) => b.branchId === branchId),
    [barbers, branchId],
  );

  const totals = useMemo(() => {
    const chosen = services.filter((s) => selectedServices.includes(s.id));
    return {
      minutes: chosen.reduce((a, s) => a + s.durationMin, 0),
      cents: chosen.reduce((a, s) => a + s.priceCents, 0),
    };
  }, [services, selectedServices]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="date" value={defaultDate} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="branchId">Sede</Label>
          <Select
            id="branchId"
            name="branchId"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            required
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="barberId">Barbero</Label>
          <Select
            id="barberId"
            name="barberId"
            required
          >
            <option value="">Selecciona…</option>
            {branchBarbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          {branchBarbers.length === 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              Esta sede no tiene barberos activos.
            </p>
          )}
        </div>
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-zinc-700">
          Servicios
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                name="serviceIds"
                value={s.id}
                checked={selectedServices.includes(s.id)}
                onChange={(e) =>
                  setSelectedServices((prev) =>
                    e.target.checked
                      ? [...prev, s.id]
                      : prev.filter((id) => id !== s.id),
                  )
                }
                className="h-4 w-4"
              />
              <span className="flex-1">{s.name}</span>
              <span className="text-xs text-zinc-500">
                {s.durationMin} min · {formatPEN(s.priceCents / 100)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-800">
        Total: {formatPEN(totals.cents / 100)} · {totals.minutes} min
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="time">Hora</Label>
          <Input id="time" name="time" type="time" step={300} defaultValue="09:00" required />
        </div>
        <div>
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Input id="notes" name="notes" placeholder="Preferencias del cliente…" maxLength={300} />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-zinc-900">Cliente</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="customerName">Nombre</Label>
            <Input id="customerName" name="customerName" placeholder="Juan Pérez" />
          </div>
          <div>
            <Label htmlFor="customerPhone">Teléfono</Label>
            <Input id="customerPhone" name="customerPhone" inputMode="tel" placeholder="987654321" />
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Si el teléfono ya existe, se reutiliza su historial.
        </p>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Creando…" : "Crear reserva"}
      </Button>
    </form>
  );
}
