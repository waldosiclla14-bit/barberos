// Constantes compartidas entre proxy (edge-safe, sin BD) y servidor.
// Mantener libre de imports de Prisma/Node.

export const SESSION_COOKIE_NAME = "barberos_session";

export function getSessionCookieNameHint(): string {
  return SESSION_COOKIE_NAME;
}
