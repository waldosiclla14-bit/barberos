"use client";

import { useActionState } from "react";
import { loginDemoAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";

const initialState: AuthFormState = {};

export function DemoForm() {
  const [state, formAction, isPending] = useActionState(
    loginDemoAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <FieldError className="text-red-400">{state.error}</FieldError>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Abriendo demo…" : "Entrar a la demo"}
      </Button>
    </form>
  );
}
