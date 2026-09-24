"use server";

import { requirePermission } from "@/lib/auth/session";
import { askAssistant } from "@/lib/ia";
import { audit } from "@/lib/audit";

export interface AskState {
  reply?: string;
  intent?: string;
  error?: string;
}

export async function askAction(prev: AskState, formData: FormData): Promise<AskState> {
  const auth = await requirePermission("ai:view");
  const message = String(formData.get("message") ?? "").trim().slice(0, 300);
  if (!message) return { error: "Escribe una pregunta." };

  const res = await askAssistant(auth.tenant.id, auth.tenant.name, message);
  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: "AI_ASSISTANT",
    entity: "Assistant",
    metadata: { intent: res.intent, message: message.slice(0, 120) },
  });
  return { reply: res.text, intent: res.intent };
}

void askAction;