# ARQUITECTURA — BARBEROS

## Decisiones clave

### Next.js 16 (App Router)
- `proxy.ts` reemplaza a `middleware.ts` (deprecado en v16). Runtime nodejs.
- APIs async: `await cookies()`, `params`/`searchParams` son Promises.
- El proxy hace chequeo **optimista** (presencia de cookie); la validación
  real ocurre en layouts (`requireUser`/`requireTenant`) y en cada Server
  Action (`requirePermission`). Nunca confiar solo en el proxy.

### Base de datos
- Desarrollo: SQLite (`file:./dev.db`) vía driver adapter
  `@prisma/adapter-better-sqlite3` (Prisma 7 query compiler).
- Producción: PostgreSQL con `@prisma/adapter-pg` (rama pendiente en
  `src/lib/prisma.ts`). El schema es portable; SQLite no soporta enums ni
  Json de Prisma → se usan `String` + validación Zod/TS (`rbac.ts`).

### Autenticación
- Sesiones opacas en BD (`Session.tokenHash` = SHA-256 del token).
- Cookie `barberos_session`: httpOnly, sameSite=lax, secure en prod, 30 días.
- Contraseñas: bcryptjs (12 rounds).
- Email globalmente único (login sin ambigüedad entre tenants).

### RBAC
Fuente única: `src/lib/auth/rbac.ts`. Roles: SUPER_ADMIN, OWNER, MANAGER,
BARBER, RECEPTIONIST, CUSTOMER. Permisos por módulo declarados desde FASE 1.

### Auditoría
`audit()` registra operaciones importantes (nunca lanza). Ver sección 69
del prompt maestro.

## Reglas
- Toda consulta de datos de negocio filtra por `tenantId`.
- Validación backend SIEMPRE (Zod); el frontend no es autoridad.
- Integraciones externas tras feature flags (`.env.example`).
- Sin mocks como producto final; datos demo solo marcados `[DEMO]`.
