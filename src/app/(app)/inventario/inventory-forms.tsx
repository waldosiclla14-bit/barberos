"use client";

import { useActionState } from "react";
import {
  adjustStockAction,
  createCategoryAction,
  createProductAction,
  createSupplierAction,
  type InventoryFormState,
} from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

const initialState: InventoryFormState = {};

interface BranchOption {
  id: string;
  name: string;
}
interface CategoryOption {
  id: string;
  name: string;
}
interface SupplierOption {
  id: string;
  name: string;
}

export function ProductForm({
  branches,
  categories,
}: {
  branches: BranchOption[];
  categories: CategoryOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    createProductAction,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="inv-name">Nombre del producto</Label>
        <Input id="inv-name" name="name" placeholder="Gel fijador 250ml" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="inv-price">Precio venta (S/)</Label>
          <Input id="inv-price" name="price" inputMode="decimal" placeholder="45.00" required />
        </div>
        <div>
          <Label htmlFor="inv-cost">Costo (S/)</Label>
          <Input id="inv-cost" name="cost" inputMode="decimal" placeholder="22.00" />
        </div>
        <div>
          <Label htmlFor="inv-stock">Stock inicial</Label>
          <Input id="inv-stock" name="stockQty" type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label htmlFor="inv-min">Alerta mínima</Label>
          <Input id="inv-min" name="minStockQty" type="number" min={0} defaultValue={3} />
        </div>
        <div>
          <Label htmlFor="inv-branch">Sede</Label>
          <Select id="inv-branch" name="branchId" required>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="inv-cat">Categoría</Label>
          <Select id="inv-cat" name="categoryId">
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-700">
          Producto creado.
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creando…" : "Crear producto"}
      </Button>
    </form>
  );
}

export function CategoryForm() {
  const [state, formAction, isPending] = useActionState(
    createCategoryAction,
    initialState,
  );
  return (
    <form action={formAction} className="flex gap-2">
      <Input name="name" placeholder="Ej: Productos capilares" required />
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "…" : "Crear"}
      </Button>
      {state.error && (
        <p role="alert" className="self-center text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function StockForm({
  branches,
  productId,
  suppliers,
  mode,
}: {
  branches: BranchOption[];
  productId: string;
  suppliers: SupplierOption[];
  mode: "IN" | "OUT";
}) {
  const [state, formAction, isPending] = useActionState(
    adjustStockAction,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="type" value={mode} />
      <div>
        <Label htmlFor={`st-${productId}-sede`}>Sede</Label>
        <Select
          id={`st-${productId}-sede`}
          name="branchId"
          required
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`st-${productId}-qty`}>Cantidad</Label>
        <Input
          id={`st-${productId}-qty`}
          name="qty"
          type="number"
          min={1}
          required
        />
      </div>
      <div>
        <Label htmlFor={`st-${productId}-reason`}>Motivo</Label>
        <Input
          id={`st-${productId}-reason`}
          name="reason"
          maxLength={200}
          placeholder={mode === "IN" ? "Compra a proveedor" : "Merma / uso"}
        />
      </div>
      {mode === "IN" && suppliers.length > 0 && (
        <div>
          <Label htmlFor={`st-${productId}-sup`}>Proveedor</Label>
          <Select
            id={`st-${productId}-sup`}
            name="supplierId"
          >
            <option value="">—</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-700">
          Stock actualizado.
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Guardando…" : mode === "IN" ? "Ingresar stock" : "Dar salida"}
      </Button>
    </form>
  );
}

export function SupplierForm() {
  const [state, formAction, isPending] = useActionState(
    createSupplierAction,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="sup-name">Proveedor</Label>
        <Input id="sup-name" name="name" placeholder="Distribuidora Lima SAC" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="sup-phone">Teléfono</Label>
          <Input id="sup-phone" name="phone" placeholder="987654321" />
        </div>
        <div>
          <Label htmlFor="sup-email">Email</Label>
          <Input id="sup-email" name="email" type="email" placeholder="ventas@ejemplo.pe" />
        </div>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-700">
          Proveedor registrado.
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : "Registrar proveedor"}
      </Button>
    </form>
  );
}