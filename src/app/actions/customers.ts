"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export interface CustomerFormState {
  error?: string;
  success?: boolean;
}

const phonePattern = /^(\+51)?9\d{8}$/;

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre completo").max(80),
  phone: z
    .string()
    .trim()
    .regex(phonePattern, "Teléfono peruano inválido (ej. 987654321)"),
  email: z.string().trim().email("Email inválido").max(120).optional().or(z.literal("")),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional(),
  preferredBarberId: z.string().optional().or(z.literal("")),
});

/** Crea un cliente. Si ya existe el teléfono, lo devuelve como error amigable. */
export async function createCustomerAction(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const auth = await requireTenant();

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? undefined,
    birthDate: formData.get("birthDate") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    preferredBarberId: formData.get("preferredBarberId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;

  const exists = await prisma.customer.findUnique({
    where: { tenantId_phone: { tenantId: auth.tenant.id, phone: d.phone } },
    select: { id: true },
  });
  if (exists) {
    return {
      error: `Ya existe un cliente con ese teléfono. Busca en la lista o reprogámale su cita.`,
    };
  }

  const customer = await prisma.customer.create({
    data: {
      tenantId: auth.tenant.id,
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      birthDate: d.birthDate ? new Date(`${d.birthDate}T12:00:00Z`) : null,
      notes: d.notes || null,
      preferredBarberId: d.preferredBarberId || null,
      source: "MANUAL",
    },
    select: { id: true },
  });

  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: "CUSTOMER_CREATED",
    entity: "Customer",
    entityId: customer.id,
  });

  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Actualiza datos del cliente. Uso interno (staff). */
export async function updateCustomerAction(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const auth = await requireTenant();

  const id = String(formData.get("customerId") ?? "");
  if (!id) return { error: "Cliente no identificado." };

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? undefined,
    birthDate: formData.get("birthDate") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    preferredBarberId: formData.get("preferredBarberId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;

  const dup = await prisma.customer.findFirst({
    where: {
      tenantId: auth.tenant.id,
      phone: d.phone,
      id: { not: id },
    },
    select: { id: true },
  });
  if (dup) return { error: "Otro cliente ya usa ese teléfono." };

  await prisma.customer.update({
    where: { id },
    data: {
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      birthDate: d.birthDate ? new Date(`${d.birthDate}T12:00:00Z`) : null,
      notes: d.notes || null,
      preferredBarberId: d.preferredBarberId || null,
    },
  });

  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: "CUSTOMER_UPDATED",
    entity: "Customer",
    entityId: id,
  });

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  return { success: true };
}

/** Agrega una nota de seguimiento a la línea de tiempo del cliente. */
export async function addCustomerNoteAction(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const auth = await requireTenant();

  const customerId = String(formData.get("customerId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!customerId) return { error: "Cliente no identificado." };
  if (!body || body.length < 2) return { error: "Escribe la nota." };
  if (body.length > 500) return { error: "Máximo 500 caracteres." };

  await prisma.customerNote.create({
    data: { customerId, userId: auth.user.id, body },
  });

  revalidatePath(`/clientes/${customerId}`);
  return { success: true };
}

/** Desactiva / reactiva un cliente. */
export async function toggleCustomerActiveAction(formData: FormData) {
  const auth = await requireTenant();

  const id = String(formData.get("customerId") ?? "");
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: auth.tenant.id },
    select: { id: true, isActive: true },
  });
  if (!customer) return;

  await prisma.customer.update({
    where: { id },
    data: { isActive: !customer.isActive },
  });

  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: customer.isActive ? "CUSTOMER_DEACTIVATED" : "CUSTOMER_REACTIVATED",
    entity: "Customer",
    entityId: id,
  });
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
}