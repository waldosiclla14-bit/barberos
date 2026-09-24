"use client";

import { useActionState } from "react";
import {
  createPromotionAction,
  togglePromotionAction,
  type PromotionFormState,
} from "@/app/actions/promotions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: PromotionFormState = {};

export function PromotionForm() {
  const [state, formAction, isPending] = useActionState(
    createPromotionAction,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="pr-name">Nombre</Label>
        <Input
          id="pr-name"
          name="name"
          placeholder="Martes 2x1 en cortes"
          required
        />
      </div>
      <div>
        <Label htmlFor="pr-desc">Descripción</Label>
        <Input id="pr-desc" name="description" placeholder="Descuento en cortes clásicos" />
      </div>
      <div>
        <Label htmlFor="pr-pct">Descuento (%)</Label>
        <Input
          id="pr-pct"
          name="discountPct"
          type="number"
          min={1}
          max={100}
          defaultValue={20}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="pr-start">Inicio</Label>
          <Input id="pr-start" name="startsAt" type="date" />
        </div>
        <div>
          <Label htmlFor="pr-end">Fin</Label>
          <Input id="pr-end" name="endsAt" type="date" />
        </div>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-700">
          Promoción creada.
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creando…" : "Crear promoción"}
      </Button>
    </form>
  );
}

export function TogglePromotion({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    togglePromotionAction,
    initialState,
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={isPending}
        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          isActive
            ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
            : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
        }`}
      >
        {isActive ? "Activa" : "Pausada"}
      </button>
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}