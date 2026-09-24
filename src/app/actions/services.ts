"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export interface FormState {
  error?: string;
  success?: boolean;
}

const solesToCents = (v: string): number => Math.round(Number(v) * 100);

const serviceSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  price: z
    .string()
    .trim()
    .regex(/^\d{1,4}(\.\d{1,2})?$/, "Precio inválido (ej. 40 o 40.50)"),
  durationMin: z.coerce
    .number()
    .int("Duración inválida")
    .min(5, "Mínimo 5 minutos")
    .max(480, "Máximo 8 horas"),
});

async function assignServiceToAllBranches(tenantId: string, serviceId: string) {
  const branches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true },
  });
  if (branches.length === 0) return;
  await prisma.serviceBranch.createMany({
    data: branches.map((b) => ({ serviceId, branchId: b.id })),
  });
}

export async function createServiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requirePermission("services:manage");
  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    durationMin: formData.get("durationMin"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    const categoryIdRaw = String(formData.get("categoryId") ?? "");
    const category = categoryIdRaw
      ? await prisma.serviceCategory.findFirst({
          where: { id: categoryIdRaw, tenantId: auth.tenant.id },
          select: { id: true },
        })
      : null;

    const service = await prisma.service.create({
      data: {
        tenantId: auth.tenant.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        priceCents: solesToCents(parsed.data.price),
        durationMin: parsed.data.durationMin,
        categoryId: category?.id ?? null,
      },
    });
    await assignServiceToAllBranches(auth.tenant.id, service.id);

    await audit({
      userId: auth.user.id,
      tenantId: auth.tenant.id,
      action: "SERVICE_CREATED",
      entity: "Service",
      entityId: service.id,
      metadata: { name: service.name, priceCents: service.priceCents },
    });
  } catch (error) {
    console.error("[createService] Error:", error);
    return { error: "No pudimos crear el servicio." };
  }

  revalidatePath("/servicios");
  return { success: true };
}

export async function updateServiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requirePermission("services:manage");
  const serviceId = String(formData.get("serviceId") ?? "");
  const isActive = formData.get("isActive") === "on";

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    durationMin: formData.get("durationMin"),
  });
  if (!parsed.success || !serviceId) {
    return { error: parsed.error?.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    await prisma.service.updateMany({
      where: { id: serviceId, tenantId: auth.tenant.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        priceCents: solesToCents(parsed.data.price),
        durationMin: parsed.data.durationMin,
        isActive,
      },
    });
    await audit({
      userId: auth.user.id,
      tenantId: auth.tenant.id,
      action: "SERVICE_UPDATED",
      entity: "Service",
      entityId: serviceId,
      metadata: { priceCents: solesToCents(parsed.data.price), isActive },
    });
  } catch (error) {
    console.error("[updateService] Error:", error);
    return { error: "No pudimos guardar los cambios." };
  }

  revalidatePath("/servicios");
  revalidatePath(`/servicios/${serviceId}`);
  return { success: true };
}

/** Reemplaza la asignación de servicios de un barbero. */
export async function setBarberServicesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requirePermission("barbers:manage");
  const barberId = String(formData.get("barberId") ?? "");
  if (!barberId) return { error: "Barbero inválido." };

  const barber = await prisma.barber.findFirst({
    where: { id: barberId, tenantId: auth.tenant.id },
    select: { id: true },
  });
  if (!barber) return { error: "Barbero no encontrado." };

  const serviceIds = formData.getAll("serviceIds").map(String).filter(Boolean);

  // Validar que todos los servicios pertenezcan al tenant
  if (serviceIds.length > 0) {
    const count = await prisma.service.count({
      where: { tenantId: auth.tenant.id, id: { in: serviceIds }, isActive: true },
    });
    if (count !== serviceIds.length) {
      return { error: "Servicio inválido detectado." };
    }
  }

  try {
    await prisma.$transaction([
      prisma.barberService.deleteMany({ where: { barberId } }),
      ...(serviceIds.length > 0
        ? [
            prisma.barberService.createMany({
              data: serviceIds.map((serviceId) => ({ barberId, serviceId })),
            }),
          ]
        : []),
    ]);
    await audit({
      userId: auth.user.id,
      tenantId: auth.tenant.id,
      action: "BARBER_SERVICES_SET",
      entity: "Barber",
      entityId: barberId,
      metadata: { serviceIds },
    });
  } catch (error) {
    console.error("[setBarberServices] Error:", error);
    return { error: "No pudimos actualizar los servicios del barbero." };
  }

  revalidatePath(`/barberos/${barberId}`);
  return { success: true };
}
