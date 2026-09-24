"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import {
  createSale,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/lib/sales";

export interface SaleFormState {
  error?: string;
  success?: boolean;
  saleId?: string;
}

const saleSchema = z.object({
  branchId: z.string().min(1),
  paymentMethod: z.enum(PAYMENT_METHODS),
  discount: z.string().regex(/^\d{0,4}(\.\d{1,2})?$/),
  redeemPoints: z.string().regex(/^\d{0,6}$/).optional(),
  customerId: z.string().optional(),
  customerName: z.string().trim().max(80).optional(),
  customerPhone: z
    .string()
    .trim()
    .regex(/^(\+51)?9\d{8}$/)
    .optional(),
});

/** POS: registra venta desde página /ventas/nueva. */
export async function createSaleAction(
  _prev: SaleFormState,
  formData: FormData,
): Promise<SaleFormState> {
  const auth = await requireTenant();

  const parsed = saleSchema.safeParse({
    branchId: formData.get("branchId"),
    paymentMethod: formData.get("paymentMethod"),
    discount: formData.get("discount") ?? "0",
    redeemPoints: formData.get("redeemPoints") ?? "0",
    customerId: formData.get("customerId") ?? undefined,
    customerName: formData.get("customerName") ?? undefined,
    customerPhone: formData.get("customerPhone") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;

  // Items: filas serviceId|qty|barberId (desde ventana sin BD no hay estado,
  // se envían inputs repetidos con prefijos)
  const serviceIds = formData.getAll("itemServiceId").map(String).filter(Boolean);
  const qtys = formData.getAll("itemQty").map((v) => Math.max(1, Number(v) || 1));
  const barberIds = formData
    .getAll("itemBarber")
    .map((v) => String(v))
    .map((v) => (v && v !== "none" ? v : undefined));

  // Productos: filas productId|qty (stock se descuenta dentro de createSale)
  const productIds = formData.getAll("productId").map(String).filter(Boolean);
  const productQtys = formData
    .getAll("productQty")
    .map((v) => Math.max(1, Number(v) || 1));

  if (serviceIds.length === 0 && productIds.length === 0) {
    return { error: "Agrega al menos un servicio o producto." };
  }

  const [services, products] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId: auth.tenant.id, id: { in: serviceIds }, isActive: true },
      select: { id: true, name: true, priceCents: true },
    }),
    prisma.product.findMany({
      where: { tenantId: auth.tenant.id, id: { in: productIds }, isActive: true },
      select: { id: true, name: true, priceCents: true, branchId: true },
    }),
  ]);
  const byId = new Map(services.map((s) => [s.id, s]));
  const prodById = new Map(products.map((p) => [p.id, p]));

  const items: {
    kind: "SERVICE" | "PRODUCT";
    serviceId?: string;
    productId?: string;
    name: string;
    qty: number;
    unitPriceCents: number;
    barberId?: string;
  }[] = [];

  serviceIds.forEach((sid, i) => {
    const s = byId.get(sid);
    if (!s) return;
    items.push({
      kind: "SERVICE",
      serviceId: sid,
      name: s.name,
      qty: qtys[i] ?? 1,
      unitPriceCents: s.priceCents,
      barberId: barberIds[i],
    });
  });
  productIds.forEach((pid, i) => {
    const p = prodById.get(pid);
    if (!p || p.branchId !== d.branchId) return;
    items.push({
      kind: "PRODUCT",
      productId: pid,
      name: p.name,
      qty: productQtys[i] ?? 1,
      unitPriceCents: p.priceCents,
    });
  });

  if (items.length === 0) return { error: "Selecciona ítems válidos para la sede." };

  // Cliente: id conocido, o nombre+teléfono (busca o crea)
  let customerId = d.customerId ?? undefined;
  if (!customerId && d.customerName && d.customerPhone) {
    const existing = await prisma.customer.findUnique({
      where: {
        tenantId_phone: { tenantId: auth.tenant.id, phone: d.customerPhone },
      },
      select: { id: true },
    });
    customerId =
      existing?.id ??
      (
        await prisma.customer.create({
          data: {
            tenantId: auth.tenant.id,
            name: d.customerName,
            phone: d.customerPhone,
            source: "WALK_IN",
          },
          select: { id: true },
        })
      ).id;
  }

  const discountCents = Math.round(
    (parseFloat(d.discount) || 0) * 100,
  );

  const result = await createSale({
    tenantId: auth.tenant.id,
    branchId: d.branchId,
    customerId,
    items,
    discountCents,
    redeemPoints: Number(d.redeemPoints) || 0,
    paymentMethod: d.paymentMethod as PaymentMethod,
    soldByUserId: auth.user.id,
  });
  if (!result.ok) return { error: result.error };

  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: "SALE_CREATED",
    entity: "Sale",
    entityId: result.saleId,
    metadata: {
      paymentMethod: d.paymentMethod,
      discountCents,
      redeemPoints: Number(d.redeemPoints) || 0,
    },
  });

  revalidatePath("/ventas");
  revalidatePath("/caja");
  revalidatePath("/dashboard");
  return { success: true, saleId: result.saleId };
}