"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export interface PromotionFormState {
  error?: string;
  success?: boolean;
}

export async function createPromotionAction(
  _prev: PromotionFormState,
  formData: FormData,
): Promise<PromotionFormState> {
  const auth = await requirePermission("promotions:manage");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const discountPct = Math.round(Number(formData.get("discountPct")) || 0);
  const startsRaw = String(formData.get("startsAt") ?? "").trim();
  const endsRaw = String(formData.get("endsAt") ?? "").trim();

  if (!name) return { error: "Nombre obligatorio." };
  if (discountPct < 1 || discountPct > 100) {
    return { error: "El descuento debe estar entre 1 y 100." };
  }

  await prisma.promotion.create({
    data: {
      tenantId: auth.tenant.id,
      name,
      description,
      discountPct,
      startsAt: startsRaw ? new Date(`${startsRaw}T00:00:00Z`) : null,
      endsAt: endsRaw ? new Date(`${endsRaw}T23:59:59Z`) : null,
    },
  });

  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: "PROMOTION_CREATED",
    entity: "Promotion",
    metadata: { discountPct },
  });
  revalidatePath("/promociones");
  return { success: true };
}

export async function togglePromotionAction(
  _prev: PromotionFormState,
  formData: FormData,
): Promise<PromotionFormState> {
  const auth = await requirePermission("promotions:manage");
  const id = String(formData.get("id") ?? "");
  const promo = await prisma.promotion.findFirst({
    where: { id, tenantId: auth.tenant.id },
    select: { isActive: true },
  });
  if (!promo) return { error: "Promoción no encontrada." };
  await prisma.promotion.update({
    where: { id },
    data: { isActive: !promo.isActive },
  });
  revalidatePath("/promociones");
  return { success: true };
}