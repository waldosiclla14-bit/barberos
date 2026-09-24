"use client";

import { useActionState, useState } from "react";
import { createSaleAction, type SaleFormState } from "@/app/actions/sales";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: SaleFormState = {};

interface ServiceOption {
  id: string;
  name: string;
  priceCents: number;
}
interface BarberOption {
  id: string;
  displayName: string;
}
interface BranchOption {
  id: string;
  name: string;
}
interface ProductOption {
  id: string;
  name: string;
  priceCents: number;
  stockQty: number;
}
interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  loyaltyPoints: number;
}

interface Line {
  key: number;
  serviceId: string;
  qty: number;
  barberId: string;
}
interface ProductLine {
  key: number;
  productId: string;
  qty: number;
}

export function PosForm({
  branches,
  services,
  barbers,
  products,
  customers,
}: {
  branches: BranchOption[];
  services: ServiceOption[];
  barbers: BarberOption[];
  products: ProductOption[];
  customers: CustomerOption[];
}) {
  const [state, formAction, isPending] = useActionState(createSaleAction, initialState);
  const [lines, setLines] = useState<Line[]>([{ key: 1, serviceId: "", qty: 1, barberId: "" }]);
  const [productLines, setProductLines] = useState<ProductLine[]>([
    { key: 2, productId: "", qty: 1 },
  ]);
  const [discount, setDiscount] = useState("0");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [customerId, setCustomerId] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("0");

  const subtotal = lines.reduce((acc, l) => {
    const s = services.find((x) => x.id === l.serviceId);
    return s ? acc + s.priceCents * l.qty : acc;
  }, 0);
  const productSubtotal = productLines.reduce((acc, l) => {
    const p = products.find((x) => x.id === l.productId);
    return p ? acc + p.priceCents * l.qty : acc;
  }, 0);
  const discountCents = Math.round((parseFloat(discount) || 0) * 100);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const maxRedeem = selectedCustomer
    ? Math.min(
        selectedCustomer.loyaltyPoints,
        Math.floor((subtotal + productSubtotal - discountCents) / 10),
      )
    : 0;
  const redeemCents = (Number(redeemPoints) || 0) * 10;
  const total = Math.max(0, subtotal + productSubtotal - discountCents - redeemCents);

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="discount" value={discount} />

      <div>
        <Label htmlFor="pos-branch">Sede</Label>
        <select
          id="pos-branch"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white h-11 px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-zinc-900">Servicios</p>
        {lines.map((line) => (
          <div key={line.key} className="grid gap-2 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[1fr_80px_1fr_auto]">
            <select
              name="itemServiceId"
              value={line.serviceId}
              onChange={(e) => updateLine(line.key, { serviceId: e.target.value })}
              required
              className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
            >
              <option value="">Selecciona servicio…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — S/ {(s.priceCents / 100).toFixed(2)}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={1}
              max={99}
              name="itemQty"
              value={line.qty}
              onChange={(e) => updateLine(line.key, { qty: Number(e.target.value) })}
              aria-label="Cantidad"
            />
            <select
              name="itemBarber"
              value={line.barberId}
              onChange={(e) => updateLine(line.key, { barberId: e.target.value })}
              className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
            >
              <option value="none">Sin barbero</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.displayName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                setLines((prev) =>
                  prev.length > 1 ? prev.filter((l) => l.key !== line.key) : prev,
                )
              }
              className="self-center px-2 text-sm text-zinc-400 hover:text-red-600"
              aria-label="Quitar"
            >
              ✕
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setLines((prev) => [
              ...prev,
              { key: Date.now(), serviceId: "", qty: 1, barberId: "" },
            ])
          }
        >
          + Agregar servicio
        </Button>
      </div>

      {products.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-900">Productos</p>
          {productLines.map((pline) => {
            const p = products.find((x) => x.id === pline.productId);
            return (
              <div
                key={pline.key}
                className="grid gap-2 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[1fr_80px_auto]"
              >
                <select
                  name="productId"
                  value={pline.productId}
                  onChange={(e) =>
                    setProductLines((prev) =>
                      prev.map((l) =>
                        l.key === pline.key ? { ...l, productId: e.target.value } : l,
                      ),
                    )
                  }
                  className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
                >
                  <option value="">Selecciona producto…</option>
                  {products.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} — S/ {(x.priceCents / 100).toFixed(2)}{" "}
                      {x.stockQty > 0 ? `(stock ${x.stockQty})` : "(sin stock)"}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={1}
                  max={p?.stockQty ?? 99}
                  name="productQty"
                  value={pline.qty}
                  onChange={(e) =>
                    setProductLines((prev) =>
                      prev.map((l) =>
                        l.key === pline.key ? { ...l, qty: Number(e.target.value) } : l,
                      ),
                    )
                  }
                  aria-label="Cantidad producto"
                />
                <button
                  type="button"
                  onClick={() =>
                    setProductLines((prev) =>
                      prev.length > 1
                        ? prev.filter((l) => l.key !== pline.key)
                        : prev,
                    )
                  }
                  className="self-center px-2 text-sm text-zinc-400 hover:text-red-600"
                  aria-label="Quitar producto"
                >
                  ✕
                </button>
              </div>
            );
          })}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setProductLines((prev) => [
                ...prev,
                { key: Date.now(), productId: "", qty: 1 },
              ])
            }
          >
            + Agregar producto
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="pos-registered">Cliente registrado</Label>
          <select
            id="pos-registered"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setRedeemPoints("0");
            }}
            className="w-full rounded-lg border border-zinc-300 bg-white h-11 px-3 text-sm text-zinc-900"
          >
            <option value="">Cliente nuevo / mostrador</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.phone} ({c.loyaltyPoints} pts)
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="pos-phone">Teléfono cliente nuevo (opcional)</Label>
          <Input
            id="pos-phone"
            name="customerPhone"
            inputMode="tel"
            placeholder="987654321"
            disabled={Boolean(customerId)}
          />
          <input type="hidden" name="customerId" value={customerId} />
        </div>
        <div>
          <Label htmlFor="pos-pay">Pago</Label>
          <select
            id="pos-pay"
            name="paymentMethod"
            defaultValue="EFECTIVO"
            className="w-full rounded-lg border border-zinc-300 bg-white h-11 px-3 text-sm text-zinc-900"
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="YAPE">Yape</option>
            <option value="PLIN">Plin</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        {selectedCustomer && (
          <div>
            <Label htmlFor="pos-points">
              Canjear puntos (disponibles: {selectedCustomer.loyaltyPoints})
            </Label>
            <Input
              id="pos-points"
              type="number"
              min={0}
              max={maxRedeem}
              value={redeemPoints}
              onChange={(e) => setRedeemPoints(e.target.value)}
              name="redeemPoints"
              disabled={maxRedeem === 0}
            />
            {maxRedeem === 0 && (
              <p className="mt-1 text-xs text-zinc-500">
                Sin puntos suficientes para esta venta.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
        <div className="flex justify-between text-zinc-600">
          <span>Subtotal</span>
          <span>S/ {(subtotal / 100).toFixed(2)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-zinc-600">
          <span>Descuento (S/)</span>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="h-9 w-28"
            inputMode="decimal"
          />
        </div>
        <div className="mt-2 flex justify-between text-base font-bold text-zinc-900">
          <span>Total</span>
          <span>S/ {(total / 100).toFixed(2)}</span>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-700">
          Venta registrada. Puedes cerrar esta ventana.
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={
          isPending ||
          (lines.every((l) => !l.serviceId) &&
            productLines.every((l) => !l.productId))
        }
      >
        {isPending ? "Registrando…" : `Cobrar S/ ${(total / 100).toFixed(2)}`}
      </Button>
    </form>
  );
}