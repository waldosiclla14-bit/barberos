# Despliegue — BARBEROS

Guía para llevar el proyecto a producción con **PostgreSQL** (Prisma 7 usa
driver adapters: el adapter se elige solo según `DATABASE_URL`).

## Requisitos

- Node.js **20+** (recomendado 22 LTS)
- PostgreSQL **15+** (el proyecto no usa extensiones especiales)

## Base de datos (una sola vez por entorno)

```bash
# 1) Variables: copia .env.example a .env y ajusta (en el host de producción)
DATABASE_URL="postgresql://usuario:password@host:5432/barberos"
AUTH_SECRET="$(openssl rand -base64 32)"

# 2) Regenera el schema PostgreSQL desde el canónico y crea el esquema
npx tsx scripts/prepare-pg.ts
npx prisma validate --config prisma.config.pg.ts
npx prisma db push --config prisma.config.pg.ts

# 3) Datos demo (solo para pruebas; en prod usa tus datos reales)
npm run db:seed

# 4) Sanity
npx tsx scripts/mint-session.ts
```

> `prisma/schema.pg.prisma` es **generado** desde `prisma/schema.prisma`
> (single source of truth). Tras cambiar modelos: vuelve a correr
> `scripts/prepare-pg.ts` y haz `db push`.

## Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión (sqlite `file:./dev.db` o `postgresql://…`) |
| `AUTH_SECRET` | Sí | Firma de tokens internos (no dejar vacío en prod) |
| `WHATSAPP_ENABLED` | No | `false` — envíos simulados/auditados; `true` con proveedor |
| `AI_ENABLED` | No | Asistente IA por reglas (funciona sin LLM) |
| `PAYMENTS_ENABLED` | No | Pagos integrados (dejar `false` por ahora) |
| `MARKETPLACE_ENABLED` | No | Temas/integraciones (demo local) |
| `*_API_KEY` | No | Credenciales de integraciones externas |

## Vercel (recomendado)

1. Repo de GitHub conectado en Vercel → importar `barberos`.
2. Build command: `npm run build` (el `postinstall` de npm ejecuta `prisma generate`).
3. Para aplicar el esquema en cada build, añade en `package.json`:
   ```json
   "build:prod": "npx tsx scripts/prepare-pg.ts && npx prisma db push --config prisma.config.pg.ts && next build"
   ```
   y usa `npm run build:prod` como build command.
4. Variables: `DATABASE_URL` y `AUTH_SECRET` en Settings → Environment Variables.
5. Despliegas en cada push a `master`.

## Render / Fly.io

- Máquina: Node 22. Servicio web: `npm run build:prod && npm start`.
- Base de datos: usa el PostgreSQL del propio proveedor; `DATABASE_URL` vía panel.
- Discos efímeros: la BD NUNCA debe ser local; por eso `prisma db push` apunta
  a tu PostgreSQL y no a `dev.db`.

## Guardas de producción

- `AUTH_SECRET` único y fuerte por entorno.
- No relocalizar la base (SQLite es solo para desarrollo local).
- Los envíos WhatsApp/email/pagos siguen siendo simulados hasta setear las
  integraciones reales (`WHATSAPP_ENABLED=true`, API keys).