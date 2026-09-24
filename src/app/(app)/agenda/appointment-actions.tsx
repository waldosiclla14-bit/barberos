"use client";

import { useState } from "react";
import {
  appointmentTransitionAction,
  rescheduleAppointmentFormAction,
} from "@/app/actions/appointments";
import type { FormState } from "@/app/actions/appointments";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useActionState } from "react";

interface Props {
  appointmentId: string;
  status: string;
}

const initialState: FormState = {};

export function AppointmentActionsBar({ appointmentId, status }: Props) {
  const [confirming, setConfirming] = useState<
    null | "CANCEL" | "NO_SHOW" | "RESCHEDULE"
  >(null);

  const act = (transition: string) => {
    const fd = new FormData();
    fd.set("appointmentId", appointmentId);
    fd.set("transition", transition);
    return appointmentTransitionAction.bind(null, fd);
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {status === "PENDING" && (
          <form action={act("RECONFIRM")}>
            <Button variant="secondary" className="h-8 px-2.5 text-xs">
              Confirmar
            </Button>
          </form>
        )}
        {(status === "PENDING" || status === "CONFIRMED") && (
          <>
            <form action={act("CHECK_IN")}>
              <Button className="h-8 px-2.5 text-xs">Check-in</Button>
            </form>
            <Button
              variant="secondary"
              className="h-8 px-2.5 text-xs"
              onClick={() => setConfirming(confirming === "RESCHEDULE" ? null : "RESCHEDULE")}
            >
              Reprogramar
            </Button>
          </>
        )}
        {status === "CHECKED_IN" && (
          <form action={act("START_SERVICE")}>
            <Button className="h-8 px-2.5 text-xs">Iniciar servicio</Button>
          </form>
        )}
        {status === "IN_SERVICE" && (
          <form action={act("COMPLETE_SERVICE")}>
            <Button className="h-8 px-2.5 text-xs">Finalizar servicio</Button>
          </form>
        )}
        {["PENDING", "CONFIRMED", "CHECKED_IN"].includes(status) && (
          <>
            <Button
              variant="secondary"
              className="h-8 px-2.5 text-xs text-red-600"
              onClick={() => setConfirming(confirming === "CANCEL" ? null : "CANCEL")}
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              className="h-8 px-2.5 text-xs text-red-600"
              onClick={() => setConfirming(confirming === "NO_SHOW" ? null : "NO_SHOW")}
            >
              No-show
            </Button>
          </>
        )}
      </div>

      {confirming && confirming !== "RESCHEDULE" && (
        <ConfirmInline
          kind={confirming}
          onCancel={() => setConfirming(null)}
        >
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <input type="hidden" name="transition" value={confirming} />
        </ConfirmInline>
      )}

      {confirming === "RESCHEDULE" && (
        <RescheduleForm
          appointmentId={appointmentId}
          onDone={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

function ConfirmInline({
  kind,
  children,
  onCancel,
}: {
  kind: "CANCEL" | "NO_SHOW";
  children: React.ReactNode;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="mb-2 text-xs font-medium text-zinc-700">
        {kind === "CANCEL"
          ? "¿Cancelar esta reserva? El horario quedará libre."
          : "¿Marcar como no-show? Quedará registrado en el historial del cliente."}
      </p>
      <div className="flex gap-2">
        <form action={appointmentTransitionAction} className="flex gap-2">
          {children}
          <input type="hidden" name="cancelReason" value={kind === "CANCEL" ? "Cancelada por el negocio" : ""} />
          <Button variant="danger" className="h-8 px-3 text-xs">
            Sí, confirmar
          </Button>
        </form>
        <Button variant="ghost" className="h-8 px-3 text-xs" onClick={onCancel}>
          Volver
        </Button>
      </div>
    </div>
  );
}

function RescheduleForm({
  appointmentId,
  onDone,
}: {
  appointmentId: string;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    rescheduleAppointmentFormAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <Label htmlFor={`fecha-${appointmentId}`}>Nueva fecha y hora</Label>
      <Input id={`fecha-${appointmentId}`} name="date" type="date" required />
      <Input name="time" type="time" step={300} defaultValue="09:00" required />
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-green-700">Reprogramada.</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} className="h-8 px-3 text-xs">
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
        <Button variant="ghost" className="h-8 px-3 text-xs" onClick={onDone}>
          Cerrar
        </Button>
      </div>
    </form>
  );
}
