import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryForm, ProductForm, StockForm } from "./inventory-forms";

export const metadata: Metadata = {
  title: "Inventario",
};

function fmtMoney(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requirePermission("inventory:view");
  const params = await searchParams;
  const onlyLow = params.alertas === "1";
  const catRaw = typeof params.categoria === "string" ? params.categoria : "";

  const [branches, categories, suppliers, products] = await Promise.all([
    prisma.branch.findMany({
      where: { tenantId: auth.tenant.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.productCategory.findMany({
      where: { tenantId: auth.tenant.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      where: { tenantId: auth.tenant.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: {
        tenantId: auth.tenant.id,
        isActive: true,
        ...(catRaw ? { categoryId: catRaw } : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        costCents: true,
        priceCents: true,
        stockQty: true,
        minStockQty: true,
        branch: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
  ]);

  const lowStock = products.filter((p) => p.stockQty <= p.minStockQty);
  const visible = onlyLow ? lowStock : products;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Inventario</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Productos por sede, stock en tiempo real y alertas de mínimo.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Productos
          </p>
          <p className="text-xl font-bold text-zinc-900">{products.length}</p>
        </div>
      </header>

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            ⚠ {lowStock.length} producto{lowStock.length === 1 ? "" : "s"} por debajo del stock mínimo
          </p>
          <p className="mt-1 text-amber-800">
            {lowStock.map((p) => p.name).join(" · ")}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <a
          href="/inventario"
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            onlyLow
              ? "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
              : "border-zinc-900 bg-zinc-900 text-white"
          }`}
        >
          Todos
        </a>
        <a
          href="/inventario?alertas=1"
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            onlyLow
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Con alerta ({lowStock.length})
        </a>
        <a
          href="/inventario/proveedores"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Proveedores
        </a>
        <form method="get" className="ml-auto flex items-end gap-2">
          <select
            name="categoria"
            defaultValue={catRaw}
            className="rounded-lg border border-zinc-300 bg-white h-9 px-3 text-sm text-zinc-900"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Filtrar
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
          </CardHeader>
          <CardBody className="px-0 py-0">
            {visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">
                {onlyLow
                  ? "Sin alertas de stock. ¡Bien!"
                  : "Crea tu primer producto con el formulario."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <th className="px-5 py-3">Producto</th>
                      <th className="px-5 py-3">Sede</th>
                      <th className="px-5 py-3 text-right">Costo</th>
                      <th className="px-5 py-3 text-right">Precio</th>
                      <th className="px-5 py-3 text-center">Stock</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {visible.map((p) => {
                      const low = p.stockQty <= p.minStockQty;
                      return (
                        <tr key={p.id} className="align-top">
                          <td className="px-5 py-3">
                            <p className="font-medium text-zinc-900">{p.name}</p>
                            <p className="text-xs text-zinc-500">{p.category?.name}</p>
                          </td>
                          <td className="px-5 py-3 text-zinc-600">{p.branch.name}</td>
                          <td className="px-5 py-3 text-right text-zinc-600">{fmtMoney(p.costCents)}</td>
                          <td className="px-5 py-3 text-right font-medium text-zinc-900">
                            {fmtMoney(p.priceCents)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                low
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {p.stockQty}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <details className="text-right">
                              <summary className="cursor-pointer text-xs font-semibold text-zinc-600 hover:text-zinc-900">
                                Stock
                              </summary>
                              <div className="mt-3 grid gap-2 rounded-lg border border-zinc-100 bg-white p-3 text-left">
                                <StockForm
                                  branches={branches}
                                  suppliers={suppliers}
                                  productId={p.id}
                                  mode="IN"
                                />
                                <StockForm
                                  branches={branches}
                                  suppliers={suppliers}
                                  productId={p.id}
                                  mode="OUT"
                                />
                              </div>
                            </details>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nuevo producto</CardTitle>
            </CardHeader>
            <CardBody>
              <ProductForm branches={branches} categories={categories} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Categoría</CardTitle>
            </CardHeader>
            <CardBody>
              <CategoryForm />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}