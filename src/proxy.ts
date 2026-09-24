import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookieNameHint } from "@/lib/auth/constants";

// Chequeo OPTIMISTA de sesión (la validación real ocurre en Server Actions/Layouts).
// No expone lógica de negocio; solo redirige según presencia de cookie.
const PROTECTED_PREFIXES = ["/dashboard", "/plataforma", "/agenda", "/clientes"];
const AUTH_ROUTES = ["/login", "/registrar"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(getSessionCookieNameHint()));

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Excluye api, estáticos y assets de Next
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
