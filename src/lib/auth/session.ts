import "server-only";
import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/auth/rbac";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

interface SessionMeta {
  ip?: string;
  userAgent?: string;
}

/** Crea sesión en BD y setea cookie httpOnly. Solo invocar desde Server Actions/Route Handlers. */
export async function createSession(userId: string, meta?: SessionMeta) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export interface AuthContext {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenantId: string | null;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    trialEndsAt: Date | null;
    currency: string;
    timezone: string;
    theme: string;
  } | null;
}

/** Valida la sesión actual (cacheada por request). Retorna null si no hay sesión válida. */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          tenantId: true,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
              status: true,
              trialEndsAt: true,
              currency: true,
              timezone: true,
              theme: true,
            },
          },
        },
      },
    },
  });

  if (!session || !session.user.isActive || session.expiresAt < new Date()) {
    return null;
  }

  const { user } = session;
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    },
    tenant: user.tenant ?? null,
  };
});

/** Guard: exige sesión válida o redirige a /login. */
export async function requireUser(): Promise<AuthContext> {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  return auth;
}

/** Guard multi-tenant: exige sesión + tenant propio del usuario. SUPER_ADMIN → /plataforma. */
export async function requireTenant(): Promise<
  AuthContext & { tenant: NonNullable<AuthContext["tenant"]> }
> {
  const auth = await requireUser();
  if (!auth.tenant) redirect("/plataforma");
  return auth as AuthContext & { tenant: NonNullable<AuthContext["tenant"]> };
}

/** Guard RBAC: exige permiso concreto o redirige al dashboard. */
export async function requirePermission(permission: Permission) {
  const auth = await requireTenant();
  if (!hasPermission(auth.user.role, permission)) redirect("/dashboard");
  return auth;
}

/** Destruye sesión actual (BD + cookie). */
export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}
