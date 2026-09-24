// FASE 9: Catálogo de temas e integraciones del Marketplace.

export interface ThemeEntry {
  code: string;
  name: string;
  description: string;
  accent: string; // hex del color de marca (fondo de CTAs/estados activos)
  accentInk: string; // tinta legible sobre accent
  accentBright: string; // variante clara de marca para superficies oscuras
  price: string;
}

export const THEMES: ThemeEntry[] = [
  {
    code: "classic",
    name: "Clásico",
    description: "Zinc monocromático, limpio y profesional. Perfecto para empezar.",
    accent: "#18181b",
    accentInk: "#ffffff",
    accentBright: "#a1a1aa",
    price: "Gratis",
  },
  {
    code: "gold",
    name: "Oro Barbero",
    description: "Dorado premium para marcas de barbería sofisticadas.",
    accent: "#c9a227",
    accentInk: "#1c1917",
    accentBright: "#e8c872",
    price: "S/ 9.90",
  },
  {
    code: "emerald",
    name: "Esmeralda",
    description: "Verde moderno con toques de frescura y estilo.",
    accent: "#047857",
    accentInk: "#ffffff",
    accentBright: "#34d399",
    price: "S/ 9.90",
  },
  {
    code: "ocean",
    name: "Océano",
    description: "Azul profundo, sobrio y con mucha personalidad.",
    accent: "#1d4ed8",
    accentInk: "#ffffff",
    accentBright: "#60a5fa",
    price: "S/ 9.90",
  },
  {
    code: "ruby",
    name: "Rubí",
    description: "Rojo vibrante para barberías con energía urbana.",
    accent: "#be123c",
    accentInk: "#ffffff",
    accentBright: "#fb7185",
    price: "S/ 9.90",
  },
];

export interface IntegrationEntry {
  code: string;
  name: string;
  description: string;
  price: string;
}

export const INTEGRATIONS: IntegrationEntry[] = [
  {
    code: "whatsapp_cloud",
    name: "WhatsApp Cloud API",
    description: "Envía confirmaciones y recordatorios reales a tus clientes.",
    price: "S/ 29/mes",
  },
  {
    code: "google_maps",
    name: "Google Business Profile",
    description: "Sincroniza tu sede con Google Maps y tu ficha de local.",
    price: "S/ 19/mes",
  },
  {
    code: "meta_pixel",
    name: "Meta Pixel",
    description: "Mide conversiones de tus campañas de publicidad.",
    price: "S/ 15/mes",
  },
  {
    code: "reports_pdf",
    name: "Reportes PDF",
    description: "Exporta ventas, caja y comisiones a PDF descargable.",
    price: "S/ 12/mes",
  },
];

export function parseIntegrations(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function themeFor(code: string | null | undefined): ThemeEntry {
  return THEMES.find((t) => t.code === code) ?? THEMES[0];
}