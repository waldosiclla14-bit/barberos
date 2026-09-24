"use client";

import { useActionState } from "react";
import { askAction, type AskState } from "@/app/actions/ia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SUGGESTIONS = [
  "¿Qué me recomiendas?",
  "Precios de corte",
  "¿Hay horas disponibles hoy?",
  "Promociones activas",
  "¿Alertas de stock?",
  "Clientes sin visita",
];

const initial: AskState = {};

export function AssistantChat() {
  const [state, formAction, isPending] = useActionState(askAction, initial);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="log"
        aria-live="polite"
        className="min-h-[220px] rounded-lg border border-zinc-200 bg-zinc-50 p-4"
      >
        <p className="rounded-lg bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-ink)">
          Hola 👋 Soy el asistente de tu barbería. Pregúntame por precios, horarios,
          promos o stock.
        </p>
        {state.reply && (
          <p className="mt-3 whitespace-pre-line rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-zinc-900">
            <span className="mr-1 rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
              {state.intent}
            </span>
            {state.reply}
          </p>
        )}
        {state.error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {state.error}
          </p>
        )}
      </div>

      <form action={formAction} className="space-y-3">
        <div className="flex gap-2">
          <Input
            name="message"
            autoComplete="off"
            placeholder="Escribe tu pregunta…"
            className="min-w-0 flex-1"
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Pensando…" : "Preguntar"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="submit"
              name="message"
              value={s}
              disabled={isPending}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}