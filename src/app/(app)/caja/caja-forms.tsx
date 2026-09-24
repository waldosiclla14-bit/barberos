"use client";

import { useActionState } from "react";
import {
  openCashSessionAction,
  closeCashSessionAction,
  registerMovementAction,
  type CashFormState,
} from "@/app/actions/cash";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: CashFormState = {};

export function OpenCashForm({
  branchId,
  hasOpen,
}: {
  branchId: string;
  hasOpen: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    openCashSessionAction,
    initialState,
  );
  if (hasOpen) {
    return (
      <p className="text-sm text-green-700">Caja abierta en esta sede hoy.</p>
    );
  }
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="branchId" value={branchId} />
      <div>
        <Label htmlFor="caja-opening">Monto inicial (S/)</Label>
        <Input
          id="caja-opening"
          name="opening"
          inputMode="decimal"
          placeholder="200.00"
          required
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-700">
          Caja abierta.
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Abriendo…" : "Abrir caja"}
      </Button>
    </form>
  );
}

export function CloseCashForm({ sessionId }: { sessionId: string }) {
  const [state, formAction, isPending] = useActionState(
    closeCashSessionAction,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div>
        <Label htmlFor="caja-closing">Conteo final en caja (S/)</Label>
        <Input
          id="caja-closing"
          name="closing"
          inputMode="decimal"
          placeholder="500.00"
          required
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-700">
          Caja cerrada.
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Cerrando…" : "Cerrar y cuadrar caja"}
      </Button>
    </form>
  );
}

export function MovementForm({
  branchId,
  sessionId,
  type,
}: {
  branchId: string;
  sessionId: string | null;
  type: "IN" | "OUT";
}) {
  const [state, formAction, isPending] = useActionState(
    registerMovementAction,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="branchId" value={branchId} />
      {sessionId && <input type="hidden" name="sessionId" value={sessionId} />}
      <input type="hidden" name="type" value={type} />
      <div>
        <Label htmlFor={`m-${type}-amount`}>
          {type === "IN" ? "Ingreso" : "Retiro / gasto"} (S/)
        </Label>
        <Input
          id={`m-${type}-amount`}
          name="amount"
          inputMode="decimal"
          placeholder={type === "IN" ? "50.00" : "20.00"}
          required
        />
      </div>
      <div>
        <Label htmlFor={`m-${type}-reason`}>Motivo</Label>
        <Input
          id={`m-${type}-reason`}
          name="reason"
          maxLength={200}
          placeholder={type === "IN" ? "Abono" : "Compra de insumos"}
          required
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Guardando…" : "Registrar"}
      </Button>
    </form>
  );
}