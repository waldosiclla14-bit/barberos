"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
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
        className="flex min-h-[220px] flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4"
      >
        <p className="self-start rounded-xl border-(--accent) bg-(--accent) px-3 py-2 text-sm text-(--accent-ink)">
          Hola 👋 Soy el asistente de tu barbería. Pregúntame por precios, horarios,
          promos o stock.
        </p>
        {state.intent && state.reply && (
          <p className="self-end whitespace-pre-line rounded-xl rounded-tr-sm border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm">
            <span className="mr-2 inline-block rounded bg-(--accent) px-1.5 py-0.5 text-[10px] font-bold uppercase text-(--accent-ink)">
              {state.intent}
            </span>
            {state.reply}
          </p>
        )}
        {isPending && (
          <p className="flex items-center gap-2 self-end rounded-xl rounded-tr-sm border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 shadow-sm">
            <Loader2 aria-hidden className="h-4 w-4 animate-spin text-(--accent-text)" />
            Pensando…
          </p>
        )}
        {state.error && (
          <p role="alert" className="text-sm text-red-600">
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
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-(--accent)/60 hover:bg-white disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}