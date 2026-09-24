"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  publicBookingAction,
  type PublicBookingState,
} from "@/app/actions/public-booking";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: PublicBookingState = {};

export function BookingForm({
  slug,
  branchId,
  barberId,
  serviceIds,
  date,
  time,
}: {
  slug: string;
  branchId: string;
  barberId: string;
  serviceIds: string[];
  date: string;
  time: string;
}) {
  const [state, formAction, isPending] = useActionState(
    publicBookingAction,
    initialState,
  );

  if (state.success) {
    return (
      <div className="rounded-xl border border-(--accent)/40 bg-(--accent)/10 p-6 text-center animate-fade-up">
        <CheckCircle2 aria-hidden className="mx-auto h-9 w-9 text-(--accent-text)" />
        <h2 className="font-display mt-3 text-lg font-semibold uppercase tracking-wide text-(--accent-text)">
          Reserva confirmada
        </h2>
        <p className="mt-1 text-sm text-zinc-700">
          Te esperamos el{" "}
          <strong>
            {new Date(`${date}T12:00:00`).toLocaleDateString("es-PE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </strong>{" "}
          a las <strong>{time}</strong>.
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          Guarda este mensaje. Si no puedes asistir, avisa con anticipación.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-zinc-900">Tus datos</h2>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="barberId" value={barberId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={time} />
      {serviceIds.map((id) => (
        <input key={id} type="hidden" name="serviceIds" value={id} />
      ))}

      <div>
        <Label htmlFor="pb-name">Nombre completo</Label>
        <Input
          id="pb-name"
          name="name"
          required
          minLength={3}
          maxLength={80}
          autoComplete="name"
          placeholder="Juan Pérez"
          className="h-12 text-base"
        />
      </div>
      <div>
        <Label htmlFor="pb-phone">Celular</Label>
        <Input
          id="pb-phone"
          name="phone"
          required
          inputMode="tel"
          pattern="(\+51)?9[0-9]{8}"
          placeholder="987654321"
          autoComplete="tel"
          className="h-12 text-base"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="h-12 w-full text-base">
        {isPending ? "Confirmando…" : "Confirmar reserva"}
      </Button>
    </form>
  );
}
