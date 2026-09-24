// FASE 8: Asistente IA por reglas. No llama a ningún LLM externo;
// responde con datos reales del tenant (catálogo, stock, promos, agenda).

import { prisma } from "@/lib/prisma";

export interface AssistantReply {
  text: string;
  intent: string;
}

const SERVICES_KEYWORDS = ["precio", "precios", "cuánto", "cuanto", "tarifa", "cobrar", "servicio"];
const TREND_KEYWORDS = ["recomiend", "sugerir", "top", "más pedido", "mas pedido", "favorito", "tendencia"];
const SLOT_KEYWORDS = ["horario", "disponible", "disponibilidad", "cita", "agendar", "libre", "hueco"];
const PROMO_KEYWORDS = ["promo", "oferta", "descuento", "barato", "campaña", "fidelidad", "puntos"];
const PRODUCT_KEYWORDS = ["producto", "gel", "shampoo", "shampú", "pomada", "stock", "existencia"];
const WARN_KEYWORDS = ["alerta", "agotar", "bajo", "quedando", "inventario bajo"];
const RENEW_KEYWORDS = ["sin visita", "recomendar rebook", "rebook", "reagendar", "vuelve"];
const HELP = `• Precios y servicios → escribe "precio" o el nombre de un servicio.
• Recomendaciones → "qué me recomiendas", "top cortes".
• Agenda → "hay horas hoy", "disponibilidad sábado".
• Promos y puntos → "promociones" o "ofertas".
• Inventario → "productos", "stock bajo", "alertas".
• Clientes → "clientes sin visita" (recomendaciones de reactivación).`;

async function servicePricing(tenantId: string, q: string): Promise<string> {
  const services = await prisma.service.findMany({
    where: { tenantId, isActive: true, name: { contains: q } },
    orderBy: { priceCents: "asc" },
    take: 6,
    select: { name: true, priceCents: true, durationMin: true },
  });
  if (services.length === 0) {
    return "No encontré servicios con ese nombre. Estos son los más baratos:\n" +
      (await topServices(tenantId));
  }
  return services
    .map((s) => `• ${s.name} — S/ ${(s.priceCents / 100).toFixed(2)} (${s.durationMin} min)`)
    .join("\n");
}

async function topServices(tenantId: string): Promise<string> {
  const services = await prisma.service.findMany({
    where: { tenantId, isActive: true },
    orderBy: { priceCents: "asc" },
    take: 4,
    select: { name: true, priceCents: true },
  });
  return services
    .map((s) => `• ${s.name} — S/ ${(s.priceCents / 100).toFixed(2)}`)
    .join("\n");
}

async function trends(tenantId: string): Promise<string> {
  const counts = await prisma.appointmentService.groupBy({
    by: ["serviceId"],
    _count: { appointmentId: true },
    where: { appointment: { tenantId } },
    orderBy: { _count: { appointmentId: "desc" } },
    take: 5,
  });
  if (counts.length === 0) {
    return "Aún no hay suficientes citas. Cuando tengas más historial te recomendaré qué promocionar.";
  }
  const ids = counts.map((c) => c.serviceId);
  const names = await prisma.service.findMany({
    where: { id: { in: ids }, tenantId },
    select: { id: true, name: true },
  });
  const byId = new Map(names.map((n) => [n.id, n.name]));
  const lines = counts.map(
    (c, i) => `${i + 1}. ${byId.get(c.serviceId) ?? "Servicio"} (${c._count.appointmentId} citas)`,
  );
  return "Tus servicios más pedidos:\n" +
    lines.join("\n") +
    "\n💡 Promociónalos esta semana con un descuento para aumentar tickets.";
}

async function availability(tenantId: string, q: string): Promise<string> {
  const d = q.match(/(lun[^,\s]*|mar[^,\s]*|mi[eé][^,\s]*|jue[^,\s]*|vie[^,\s]*|s[aá]b[^,\s]*|dom[^,\s]*)/i);
  const now = new Date();
  let day = now;
  if (d) {
    const MAP: Record<string, number> = { lun: 1, mar: 2, mi: 3, jue: 4, vie: 5, sab: 6, dom: 0 };
    const target = MAP[d[1].slice(0, 3).toLowerCase()];
    if (target !== undefined) {
      const diff = (target - now.getDay() + 7) % 7;
      day = new Date(now.getTime() + diff * 86400000);
    }
  }
  day.setHours(0, 0, 0, 0);
  const start = new Date(day);
  const end = new Date(day.getTime() + 86400000);

  const bars = await prisma.barber.findMany({
    where: { tenantId, branch: { isActive: true }, isActive: true },
    select: {
      id: true,
      displayName: true,
      branch: { select: { name: true } },
      timeOffs: {
        where: { startsAt: { lt: end }, endsAt: { gt: start } },
        select: { id: true },
      },
    },
  });
  const busy = await prisma.appointment.findMany({
    where: {
      tenantId,
      startsAt: { gte: start, lt: end },
      status: { in: ["CONFIRMED", "CHECKED_IN", "IN_SERVICE"] },
    },
    select: { barberId: true },
  });
  const busyCount = new Map<string, number>();
  for (const b of busy) {
    busyCount.set(b.barberId, (busyCount.get(b.barberId) ?? 0) + 1);
  }

  const label = day.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  if (bars.length === 0) return "No hay barberos activos.";
  const lines = bars.map((b) => {
    if (b.timeOffs.length > 0) return `• ${b.displayName} (${b.branch.name}) — descanso ese día`;
    const n = busyCount.get(b.id) ?? 0;
    return `• ${b.displayName} (${b.branch.name}) — ${n} citas ya, varios huecos libres`;
  });
  return `Disponibilidad para ${label}:\n${lines.join("\n")}`;
}

async function promos(tenantId: string): Promise<string> {
  const now = new Date();
  const list = await prisma.promotion.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { discountPct: "desc" },
    take: 5,
    select: { name: true, description: true, discountPct: true, endsAt: true },
  });
  if (list.length === 0) {
    return "No hay promociones activas. Crea una desde el módulo Promociones y aparecerá aquí.";
  }
  return (
    "Promociones activas:\n" +
    list
      .map(
        (p) =>
          `• ${p.name} (${p.discountPct}% OFF)` +
          (p.endsAt
            ? ` hasta ${p.endsAt.toLocaleDateString("es-PE")}`
            : "") +
          (p.description ? ` — ${p.description}` : ""),
      )
      .join("\n")
  );
}

async function products(tenantId: string, q: string): Promise<string> {
  const nameQ = q.replace(/producto|productos|gel|shampoo|shampú|pomada|ci|existencias/gi, "").trim();
  const where = {
    tenantId,
    isActive: true,
    ...(nameQ ? { name: { contains: nameQ } } : {}),
  };
  const list = await prisma.product.findMany({
    where,
    orderBy: { stockQty: "desc" },
    take: 6,
    select: { name: true, stockQty: true, minStockQty: true, priceCents: true },
  });
  if (list.length === 0) return "No encontré productos con ese nombre.";
  return list
    .map(
      (p) =>
        `• ${p.name} — ${p.stockQty} unid.` +
        (p.stockQty <= p.minStockQty ? " ⚠️ BAJO STOCK" : "") +
        ` — S/ ${(p.priceCents / 100).toFixed(2)}`,
    )
    .join("\n");
}

async function renewal(tenantId: string): Promise<string> {
  const now = new Date();
  const back = new Date(now.getTime() - 90 * 86400000);
  const clients = await prisma.customer.findMany({
    where: { tenantId, createdAt: { lt: back } },
    orderBy: { createdAt: "asc" },
    take: 3,
    select: { name: true, phone: true, createdAt: true },
  });
  if (clients.length === 0) {
    return "Todos tus clientes visitaron recientemente (últimos 90 días). 🎉";
  }
  return (
    "Clientes sin visita en +90 días (buen foco para reactivar):\n" +
    clients
      .map(
        (c) =>
          `• ${c.name} — último registro ${c.createdAt.toLocaleDateString("es-PE")} → WhatsApp ${c.phone}`,
      )
      .join("\n") +
    "\n💡 Mándales una promo de rebook (plantilla REBOOK en Notificaciones)."
  );
}

export async function askAssistant(tenantId: string, tenantName: string, message: string): Promise<AssistantReply> {
  const q = message.toLowerCase();

  if (SERVICES_KEYWORDS.some((k) => q.includes(k))) {
    const nameQ = q.replace(/¿|cuánto|cuanto|precio|precios|tarifa|cuesta|cobran|servicio/g, "").trim();
    const text = `En ${tenantName}:\n${await servicePricing(tenantId, nameQ)}`;
    return { intent: "PRICING", text };
  }
  if (TREND_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "TRENDS", text: await trends(tenantId) };
  }
  if (PROMO_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "PROMOS", text: await promos(tenantId) };
  }
  if (RENEW_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "RENEWAL", text: await renewal(tenantId) };
  }
  if (WARN_KEYWORDS.some((k) => q.includes(k))) {
    const byName = await prisma.product.findMany({
      where: { tenantId, isActive: true, stockQty: { lte: 3 } },
      orderBy: { stockQty: "asc" },
      take: 6,
      select: { name: true, stockQty: true, priceCents: true },
    });
    if (byName.length === 0) return { intent: "STOCK", text: "El inventario está saludable: ningún producto cerca de agotarse. 💪" };
    return {
      intent: "STOCK",
      text:
        "⚠️ Productos por agotarse (stock ≤ 3):\n" +
        byName.map((p) => `• ${p.name} — ${p.stockQty} unid.`).join("\n") +
        "\n💡 Compra más antes del fin de semana.",
    };
  }
  if (PRODUCT_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "PRODUCTS", text: await products(tenantId, message.toLowerCase()) };
  }
  if (SLOT_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "AVAILABILITY", text: await availability(tenantId, message.toLowerCase()) };
  }
  if (q.includes("hola") || q.includes("buenas") || q.includes("ayuda")) {
    return { intent: "HELP", text: `Hola 👋 Soy el asistente de ${tenantName}. Puedo ayudarte con:\n${HELP}` };
  }

  return {
    intent: "HELP",
    text:
      `Puedo ayudarte con datos reales de ${tenantName}. Intenta con:\n${HELP}`,
  };
}