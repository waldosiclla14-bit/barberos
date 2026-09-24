"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { parseHHmm } from "@/lib/scheduling/time";

export interface FormState {
  error?: string;
  success?: boolean;
}

const branchSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(60),
  address: z.string().trim().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(15).optional().or(z.literal("")),
});

export async function createBranchAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requirePermission("branches:manage");
  const parsed = branchSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    const branch = await prisma.branch.create({
      data: {
        tenantId: auth.tenant.id,
        name: parsed.data.name,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
      },
    });
    // Horario por defecto L-S 9:00-19:00, domingo cerrado
    const defaults = Array.from({ length: 7 }, (_, weekday) => ({
      branchId: branch.id,
      weekday,
      isClosed: weekday === 0,
      openMin: 540,
      closeMin: 1140,
    }));
    await prisma.branchSchedule.createMany({ data: defaults });

    await audit({
      userId: auth.user.id,
      tenantId: auth.tenant.id,
      action: "BRANCH_CREATED",
      entity: "Branch",
      entityId: branch.id,
      metadata: { name: branch.name },
    });
  } catch (error) {
    console.error("[createBranch] Error:", error);
    return { error: "No pudimos crear la sede. Intenta nuevamente." };
  }

  revalidatePath("/sedes");
  return { success: true };
}

export async function updateBranchAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requirePermission("branches:manage");
  const branchId = String(formData.get("branchId") ?? "");
  const isActive = formData.get("isActive") === "on";

  const parsed = branchSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success || !branchId) {
    return { error: parsed.error?.issues[0]?.message ?? "Datos inválidos" };
  }

  // No desactivar la última sede activa
  if (!isActive) {
    const activeCount = await prisma.branch.count({
      where: { tenantId: auth.tenant.id, isActive: true },
    });
    const current = await prisma.branch.findFirst({
      where: { id: branchId, tenantId: auth.tenant.id },
      select: { isActive: true },
    });
    if (current?.isActive && activeCount <= 1) {
      return { error: "Debe existir al menos una sede activa." };
    }
  }

  try {
    await prisma.branch.updateMany({
      where: { id: branchId, tenantId: auth.tenant.id },
      data: {
        name: parsed.data.name,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
        isActive,
      },
    });
    await audit({
      userId: auth.user.id,
      tenantId: auth.tenant.id,
      action: "BRANCH_UPDATED",
      entity: "Branch",
      entityId: branchId,
    });
  } catch (error) {
    console.error("[updateBranch] Error:", error);
    return { error: "No pudimos guardar los cambios." };
  }

  revalidatePath("/sedes");
  revalidatePath(`/sedes/${branchId}`);
  return { success: true };
}

export async function setBranchHoursAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requirePermission("branches:manage");
  const branchId = String(formData.get("branchId") ?? "");
  if (!branchId) return { error: "Sede inválida." };

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId: auth.tenant.id },
    select: { id: true },
  });
  if (!branch) return { error: "Sede no encontrada." };

  const days: {
    weekday: number;
    isClosed: boolean;
    openMin: number;
    closeMin: number;
  }[] = [];

  for (let weekday = 0; weekday < 7; weekday++) {
    const closed = formData.get(`closed-${weekday}`) === "on";
    const openRaw = String(formData.get(`open-${weekday}`) ?? "09:00");
    const closeRaw = String(formData.get(`close-${weekday}`) ?? "19:00");
    const openMin = parseHHmm(openRaw);
    const closeMin = parseHHmm(closeRaw);
    if (openMin === null || closeMin === null) {
      return { error: `Horario inválido el día ${weekday}.` };
    }
    if (!closed && openMin >= closeMin) {
      return { error: `La apertura debe ser anterior al cierre el día ${weekday}.` };
    }
    days.push({ weekday, isClosed: closed, openMin, closeMin });
  }

  try {
    for (const day of days) {
      await prisma.branchSchedule.upsert({
        where: { branchId_weekday: { branchId, weekday: day.weekday } },
        create: { branchId, ...day },
        update: {
          isClosed: day.isClosed,
          openMin: day.openMin,
          closeMin: day.closeMin,
        },
      });
    }
    await audit({
      userId: auth.user.id,
      tenantId: auth.tenant.id,
      action: "BRANCH_HOURS_UPDATED",
      entity: "Branch",
      entityId: branchId,
    });
  } catch (error) {
    console.error("[setBranchHours] Error:", error);
    return { error: "No pudimos guardar el horario." };
  }

  revalidatePath(`/sedes/${branchId}`);
  return { success: true };
}
