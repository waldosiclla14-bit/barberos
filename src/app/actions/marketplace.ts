"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { audit } from "@/lib/audit";
import { INTEGRATIONS, THEMES, parseIntegrations } from "@/lib/themes";

export interface MarketplaceState {
  error?: string;
  success?: string;
}

function authorize() {
  // Requiere permisos de configuración; solo roles de gestión.
  return requirePermission("settings:manage");
}

export async function installThemeAction(
  _prev: MarketplaceState,
  formData: FormData,
): Promise<MarketplaceState> {
  const auth = await authorize();
  if (!hasPermission(auth.user.role, "settings:manage")) {
    return { error: "Sin permisos para instalar temas." };
  }
  const code = String(formData.get("theme") ?? "");
  if (!THEMES.some((t) => t.code === code)) {
    return { error: "Tema desconocido." };
  }
  await prisma.tenant.update({
    where: { id: auth.tenant.id },
    data: { theme: code },
  });
  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: "THEME_INSTALLED",
    entity: "Tenant",
    entityId: auth.tenant.id,
    metadata: { theme: code },
  });
  revalidatePath("/marketplace");
  revalidatePath("/dashboard");
  return { success: `Tema "${code}" instalado para ${auth.tenant.name}.` };
}

export async function toggleIntegrationAction(
  _prev: MarketplaceState,
  formData: FormData,
): Promise<MarketplaceState> {
  const auth = await authorize();
  if (!hasPermission(auth.user.role, "settings:manage")) {
    return { error: "Sin permisos para gestionar integraciones." };
  }
  const code = String(formData.get("integration") ?? "");
  if (!INTEGRATIONS.some((i) => i.code === code)) {
    return { error: "Integración desconocida." };
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.tenant.id },
    select: { integrations: true },
  });
  const current = parseIntegrations(tenant?.integrations ?? "[]");
  const next = current.includes(code)
    ? current.filter((c) => c !== code)
    : [...current, code];
  await prisma.tenant.update({
    where: { id: auth.tenant.id },
    data: { integrations: JSON.stringify(next) },
  });
  await audit({
    userId: auth.user.id,
    tenantId: auth.tenant.id,
    action: "INTEGRATION_TOGGLED",
    entity: "Tenant",
    entityId: auth.tenant.id,
    metadata: { integration: code, installed: next.includes(code) },
  });
  revalidatePath("/marketplace");
  return {
    success: next.includes(code)
      ? `"${code}" habilitada.`
      : `"${code}" deshabilitada.`,
  };
}