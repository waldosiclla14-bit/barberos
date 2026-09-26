"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";

export interface AuthFormState {
  error?: string;
}

const registerSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(3, "El nombre de la barbería debe tener al menos 3 caracteres")
    .max(80),
  ownerName: z
    .string()
    .trim()
    .min(3, "Ingresa tu nombre completo")
    .max(80),
  email: z.string().trim().toLowerCase().email("Email inválido").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(\+51)?9\d{8}$/, "Teléfono peruano inválido (ej. 987654321)")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72),
});

async function requestMeta() {
  const headerList = await headers();
  return {
    ip:
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      undefined,
    userAgent: headerList.get("user-agent") ?? undefined,
  };
}

/** Registro de negocio: crea Tenant + usuario OWNER en una transacción. */
export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    businessName: formData.get("businessName"),
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existingUser) {
    return { error: "Ese email ya está registrado. Inicia sesión." };
  }

  // Slug único a partir del nombre del negocio
  const baseSlug = slugify(data.businessName) || "barberia";
  let slug = baseSlug;
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
    if (!clash) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const meta = await requestMeta();
  const passwordHash = await hashPassword(data.password);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.businessName,
          slug,
          plan: "FREE",
          status: "TRIAL",
          trialEndsAt,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.email,
          name: data.ownerName,
          phone: data.phone || null,
          passwordHash,
          role: "OWNER",
        },
      });

      return { tenant, user };
    });

    await audit({
      userId: result.user.id,
      tenantId: result.tenant.id,
      action: "TENANT_CREATED",
      entity: "Tenant",
      entityId: result.tenant.id,
      metadata: { name: result.tenant.name, plan: "FREE" },
      ip: meta.ip,
    });
    await audit({
      userId: result.user.id,
      tenantId: result.tenant.id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: result.user.id,
      metadata: { role: "OWNER", email: data.email },
      ip: meta.ip,
    });

    await createSession(result.user.id, meta);
  } catch (error) {
    console.error("[register] Error:", error);
    return {
      error: "No pudimos completar el registro. Intenta nuevamente.",
    };
  }

  redirect("/dashboard?bienvenida=1");
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu email y contraseña." };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Mensaje genérico: no revelar si existe el email
  const genericError = { error: "Email o contraseña incorrectos." };
  if (!user || !user.isActive) return genericError;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return genericError;

  const meta = await requestMeta();
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await audit({
    userId: user.id,
    tenantId: user.tenantId,
    action: "USER_LOGIN",
    entity: "User",
    entityId: user.id,
    ip: meta.ip,
  });

  await createSession(user.id, meta);
  redirect(user.tenantId ? "/dashboard" : "/plataforma");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/**
 * Acceso a la demo con un clic: inicia sesión con el usuario demo
 * sembrado (demo@barberos.pe). Falla cerrado si ese usuario no existe
 * (p. ej. producción sin seed), sin exponer nada.
 */
export async function loginDemoAction(
  _prev: AuthFormState,
): Promise<AuthFormState> {
  void _prev;
  const user = await prisma.user.findUnique({
    where: { email: "demo@barberos.pe" },
    select: { id: true, tenantId: true, isActive: true, role: true },
  });
  if (!user || !user.isActive || user.role !== "OWNER") {
    return { error: "La demo no está disponible en este entorno." };
  }

  const meta = await requestMeta();
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await audit({
    userId: user.id,
    tenantId: user.tenantId,
    action: "USER_LOGIN_DEMO",
    entity: "User",
    entityId: user.id,
    ip: meta.ip,
  });

  await createSession(user.id, meta);
  redirect("/dashboard");
}
