"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export interface InventoryFormState {
  error?: string;
  success?: boolean;
}

const money = (v: FormDataEntryValue | null) => {
  const raw = String(v ?? "").trim();
  return /^\d{1,6}(\.\d{1,2})?$/.test(raw)
    ? Math.round(parseFloat(raw) * 100)
    : null;
};

export async function createProductAction(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const auth = await requirePermission("inventory:manage");

  const name = String(formData.get("name") ?? "").trim();
  const branchId = String(formData.get("branchId") ?? "");
  const rawCategoryId = String(formData.get("categoryId") ?? "") || null;
  const categoryId =
    rawCategoryId && rawCategoryId !== "none" ? rawCategoryId : null;
  const price = money(formData.get("price"));
  const cost = money(formData.get("cost")) ?? 0;
  const stockQty = Math.max(0, Number(formData.get("stockQty")) || 0);
  const minStockQty = Math.max(0, Number(formData.get("minStockQty")) || 0);

  if (!name || !branchId) return { error: "Nombre y sede son obligatorios." };
  if (price === null) return { error: "Precio inválido." };

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId: auth.tenant.id },
    select: { id: true },
  });
  if (!branch) return { error: "Sede no encontrada." };
  const category =
    categoryId
      ? await prisma.productCategory.findFirst({
          where: { id: categoryId, tenantId: auth.tenant.id },
          select: { id: true },
        })
      : null;
  if (categoryId && !category) {
    return { error: "Categoría no encontrada." };
  }

  const product = await prisma.product.create({
    data: {
      tenantId: auth.tenant.id,
      branchId,
      categoryId,
      name,
      costCents: cost,
      priceCents: price,
      stockQty,
      minStockQty,
    },
    select: { id: true },
  });
  if (stockQty > 0) {
    await prisma.stockMovement.create({
      data: {
        tenantId: auth.tenant.id,
        branchId,
        productId: product.id,
        type: "ADJUST",
        qty: stockQty,
        stockAfter: stockQty,
        reason: "Stock inicial",
        userId: auth.user.id,
      },
    });
  }
  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: "PRODUCT_CREATED",
    entity: "Product",
    entityId: product.id,
  });
  revalidatePath("/inventario");
  return { success: true };
}

export async function updateProductAction(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const auth = await requirePermission("inventory:manage");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const price = money(formData.get("price"));
  const cost = money(formData.get("cost")) ?? 0;
  const minStockQty = Math.max(0, Number(formData.get("minStockQty")) || 0);

  if (!id || !name) return { error: "Nombre obligatorio." };
  if (price === null) return { error: "Precio inválido." };

  await prisma.product.updateMany({
    where: { id, tenantId: auth.tenant.id },
    data: { name, categoryId, priceCents: price, costCents: cost, minStockQty },
  });
  revalidatePath("/inventario");
  return { success: true };
}

export async function adjustStockAction(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const auth = await requirePermission("inventory:manage");

  const productId = String(formData.get("productId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const type = String(formData.get("type") ?? "");
  const qty = Math.abs(Math.round(Number(formData.get("qty")) || 0));
  const reason = String(formData.get("reason") ?? "").trim();
  const supplierId = String(formData.get("supplierId") ?? "") || null;

  if (!productId || !qty || qty > 1_000_000) return { error: "Cantidad inválida." };
  if (!["IN", "OUT", "ADJUST"].includes(type)) return { error: "Tipo inválido." };

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: auth.tenant.id },
    select: { id: true, stockQty: true, branchId: true },
  });
  if (!product) return { error: "Producto no encontrado." };
  if (product.branchId !== branchId) {
    return { error: "El producto pertenece a otra sede." };
  }
  if (supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId: auth.tenant.id },
      select: { id: true },
    });
    if (!supplier) return { error: "Proveedor no encontrado." };
  }

  const delta = type === "OUT" ? -qty : qty;
  const stockAfter = product.stockQty + delta;
  if (stockAfter < 0) return { error: "Stock insuficiente para esa salida." };

  await prisma.$transaction([
    prisma.product.update({
      where: { id: product.id },
      data: { stockQty: stockAfter },
    }),
    prisma.stockMovement.create({
      data: {
        tenantId: auth.tenant.id,
        branchId,
        productId: product.id,
        type,
        qty,
        stockAfter,
        reason: reason.slice(0, 200) || (type === "IN" ? "Ingreso" : "Salida"),
        userId: auth.user.id,
      },
    }),
  ]);

  if (supplierId && type === "IN") {
    await audit({
      userId: auth.user.id,
      tenantId: auth.tenant.id,
      action: "PURCHASE_RECEIVED",
      entity: "Product",
      entityId: product.id,
      metadata: { supplierId, qty },
    });
  }

  revalidatePath("/inventario");
  return { success: true };
}

export async function toggleProductActiveAction(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const auth = await requirePermission("inventory:manage");
  const id = String(formData.get("id") ?? "");
  await prisma.product.updateMany({
    where: { id, tenantId: auth.tenant.id },
    data: { isActive: false },
  });
  revalidatePath("/inventario");
  return { success: true };
}

export async function createCategoryAction(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const auth = await requirePermission("inventory:manage");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nombre obligatorio." };
  await prisma.productCategory.create({
    data: { tenantId: auth.tenant.id, name },
  });
  revalidatePath("/inventario");
  return { success: true };
}

export async function createSupplierAction(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const auth = await requirePermission("inventory:manage");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  if (!name) return { error: "Nombre obligatorio." };
  await prisma.supplier.create({
    data: { tenantId: auth.tenant.id, name, phone, email },
  });
  revalidatePath("/inventario/proveedores");
  return { success: true };
}