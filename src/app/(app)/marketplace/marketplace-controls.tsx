"use client";

import { useActionState } from "react";
import {
  installThemeAction,
  toggleIntegrationAction,
  type MarketplaceState,
} from "@/app/actions/marketplace";
import { Button } from "@/components/ui/button";

const initial: MarketplaceState = {};

export function InstallThemeButton({
  code,
  current,
  disabled,
}: {
  code: string;
  current: boolean;
  disabled: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    installThemeAction,
    initial,
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="theme" value={code} />
      {state.error && (
        <p role="alert" className="mb-2 text-xs text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="mb-2 text-xs text-green-700">
          {state.success}
        </p>
      )}
      <Button
        type="submit"
        disabled={disabled || isPending}
        variant={current ? "secondary" : "primary"}
      >
        {current ? "Instalado ✓" : isPending ? "…" : "Instalar"}
      </Button>
    </form>
  );
}

export function ToggleIntegration({
  code,
  installed,
  disabled,
}: {
  code: string;
  installed: boolean;
  disabled: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    toggleIntegrationAction,
    initial,
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="integration" value={code} />
      {state.error && (
        <p role="alert" className="mb-2 text-xs text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="mb-2 text-xs text-green-700">
          {state.success}
        </p>
      )}
      <Button
        type="submit"
        disabled={disabled || isPending}
        variant={installed ? "secondary" : "primary"}
      >
        {installed ? "Quitar integración" : "Instalar"}
      </Button>
    </form>
  );
}