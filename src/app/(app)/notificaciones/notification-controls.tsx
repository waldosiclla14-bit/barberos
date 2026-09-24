"use client";

import { useActionState } from "react";
import {
  resetTemplatesAction,
  sendRemindersAction,
  setChannelAction,
  type NotificationFormState,
} from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";

const initialState: NotificationFormState = {};

export function SendRemindersButton() {
  const [state, formAction, isPending] = useActionState(
    sendRemindersAction,
    initialState,
  );
  return (
    <form action={formAction}>
      {state.success && state.sent !== undefined && (
        <p role="status" className="mb-2 text-sm text-green-700">
          {state.sent > 0
            ? `Recordatorios enviados: ${state.sent}.`
            : "No hay citas confirmadas para mañana aún."}
        </p>
      )}
      {state.error && (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Enviando…" : "Enviar recordatorios (mañana)"}
      </Button>
    </form>
  );
}

export function ResetTemplatesButton() {
  const [state, formAction, isPending] = useActionState(
    resetTemplatesAction,
    initialState,
  );
  return (
    <form action={formAction}>
      {state.success && (
        <p role="status" className="mb-2 text-sm text-green-700">
          Plantillas por defecto restauradas.
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "…" : "Restaurar plantillas por defecto"}
      </Button>
    </form>
  );
}

export function ChannelSwitch({
  kind,
  current,
}: {
  kind: string;
  current: string;
}) {
  const [state, formAction, isPending] = useActionState(
    setChannelAction,
    initialState,
  );
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="kind" value={kind} />
      <select
        name="channel"
        defaultValue={current}
        className="rounded-lg border border-zinc-300 bg-white h-9 px-2 text-sm text-zinc-900"
      >
        <option value="WHATSAPP">WhatsApp</option>
        <option value="EMAIL">Email</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
      >
        Guardar
      </button>
      {state.error && (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}