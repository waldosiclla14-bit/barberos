"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { sendReminders, upsertTemplateDefaults } from "@/lib/notifications";

export interface NotificationFormState {
  error?: string;
  success?: boolean;
  sent?: number;
}

export async function sendRemindersAction(): Promise<NotificationFormState> {
  const auth = await requirePermission("reports:view");
  const { sent } = await sendReminders(auth.tenant.id);
  if (sent > 0) {
    await audit({
      userId: auth.user.id,
      tenantId: auth.tenant.id,
      action: "REMINDERS_SENT",
      entity: "MessageLog",
      metadata: { sent },
    });
  }
  revalidatePath("/notificaciones");
  return { success: true, sent };
}

export async function resetTemplatesAction(): Promise<NotificationFormState> {
  const auth = await requirePermission("reports:view");
  await upsertTemplateDefaults(auth.tenant.id);
  revalidatePath("/notificaciones");
  return { success: true };
}

export async function setChannelAction(
  _prev: NotificationFormState,
  formData: FormData,
): Promise<NotificationFormState> {
  const auth = await requirePermission("reports:view");
  const kind = String(formData.get("kind") ?? "");
  const channel = String(formData.get("channel") ?? "");
  if (channel !== "WHATSAPP" && channel !== "EMAIL") {
    return { error: "Canal inválido." };
  }
  await upsertTemplateDefaults(auth.tenant.id);
  await import("@/lib/prisma").then(({ prisma }) =>
    prisma.notificationTemplate.updateMany({
      where: { tenantId: auth.tenant.id, kind },
      data: { channel },
    }),
  );
  revalidatePath("/notificaciones");
  return { success: true };
}