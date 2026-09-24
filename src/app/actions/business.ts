"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export interface BusinessFormState {
  error?: string;
  success?: boolean;
}

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(80),
});

/** Actualiza datos básicos del negocio. Requiere settings:manage (OWNER). */
export async function updateBusinessAction(
  _prev: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const auth = await requirePermission("settings:manage");

  const parsed = schema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    await prisma.tenant.update({
      where: { id: auth.tenant.id },
      data: { name: parsed.data.name },
    });

    await audit({
      userId: auth.user.id,
      tenantId: auth.tenant.id,
      action: "TENANT_UPDATED",
      entity: "Tenant",
      entityId: auth.tenant.id,
      metadata: { name: parsed.data.name },
    });
  } catch (error) {
    console.error("[updateBusiness] Error:", error);
    return { error: "No pudimos guardar los cambios. Intenta nuevamente." };
  }

  revalidatePath("/configuracion");
  revalidatePath("/dashboard");
  return { success: true };
}
