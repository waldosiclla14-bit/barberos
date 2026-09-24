"use client";

import { useActionState } from "react";
import {
  createCustomerAction,
  updateCustomerAction,
  addCustomerNoteAction,
  toggleCustomerActiveAction,
  type CustomerFormState,
} from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

const initialState: CustomerFormState = {};

interface BarberOption {
  id: string;
  displayName: string;
}

interface CustomerValues {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
  preferredBarberId: string | null;
  isActive?: boolean;
}

export function CustomerForm({
  customer,
  barbers,
  formId,
}: {
  customer?: CustomerValues;
  barbers: BarberOption[];
  formId?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    customer?.id ? updateCustomerAction : createCustomerAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-3"
      {...(formId ? { id: formId } : {})}
    >
      {customer?.id && (
        <input type="hidden" name="customerId" value={customer.id} />
      )}
      <div>
        <Label htmlFor={`name-${formId ?? "new"}`}>Nombre</Label>
        <Input
          id={`name-${formId ?? "new"}`}
          name="name"
          defaultValue={customer?.name ?? ""}
          required
          minLength={2}
          maxLength={80}
          placeholder="Juan Pérez"
        />
      </div>
      <div>
        <Label htmlFor={`phone-${formId ?? "new"}`}>Teléfono</Label>
        <Input
          id={`phone-${formId ?? "new"}`}
          name="phone"
          defaultValue={customer?.phone ?? ""}
          required
          inputMode="tel"
          pattern="(\+51)?9\d{8}"
          placeholder="987654321"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`email-${formId ?? "new"}`}>Email (opcional)</Label>
          <Input
            id={`email-${formId ?? "new"}`}
            name="email"
            type="email"
            defaultValue={customer?.email ?? ""}
            placeholder="cliente@correo.pe"
          />
        </div>
        <div>
          <Label htmlFor={`birth-${formId ?? "new"}`}>Nacimiento (opcional)</Label>
          <Input
            id={`birth-${formId ?? "new"}`}
            name="birthDate"
            type="date"
            defaultValue={customer?.birthDate ?? ""}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`barber-${formId ?? "new"}`}>Barbero favorito (opcional)</Label>
        <select
          id={`barber-${formId ?? "new"}`}
          name="preferredBarberId"
          defaultValue={customer?.preferredBarberId ?? ""}
          className="w-full rounded-lg border border-zinc-300 bg-white h-11 px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        >
          <option value="">Selecciona…</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.displayName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor={`notes-${formId ?? "new"}`}>Notas iniciales (opcional)</Label>
        <Textarea
          id={`notes-${formId ?? "new"}`}
          name="notes"
          maxLength={1000}
          defaultValue={customer?.notes ?? ""}
          placeholder="Preferencias, restricciones, etc."
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-700">
          Guardado.
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Guardando…" : customer?.id ? "Guardar cambios" : "Registrar cliente"}
      </Button>
    </form>
  );
}

export function CustomerNoteForm({ customerId }: { customerId: string }) {
  const [state, formAction, isPending] = useActionState(
    addCustomerNoteAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="customerId" value={customerId} />
      <div>
        <Label htmlFor="note-body">Nueva nota</Label>
        <Textarea
          id="note-body"
          name="body"
          maxLength={500}
          required
          minLength={2}
          placeholder="Ej. prefiere atención con Carlos, llega tarde los martes…"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Guardando…" : "Agregar nota"}
      </Button>
    </form>
  );
}

export function ToggleCustomerActive({ customerId }: { customerId: string }) {
  return (
    <form action={toggleCustomerActiveAction}>
      <input type="hidden" name="customerId" value={customerId} />
      <Button type="submit" variant="danger">
        Desactivar cliente
      </Button>
    </form>
  );
}

export function ReopenCustomerForm({ customerId }: { customerId: string }) {
  return (
    <form action={toggleCustomerActiveAction}>
      <input type="hidden" name="customerId" value={customerId} />
      <Button type="submit" variant="secondary">
        Reactivar
      </Button>
    </form>
  );
}