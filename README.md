# BARBEROS

**El sistema operativo para barberías.**
SaaS multi-tenant para barberías, barbershops y cadenas en Perú.

> Despliegue a producción: ver [DEPLOY.md](DEPLOY.md) (PostgreSQL + Vercel/Render/Fly).

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + React 19
- **Tailwind CSS 4**
- **Prisma 7** (driver adapters) — SQLite en desarrollo, PostgreSQL en producción
- **Zod** (validación), **bcryptjs** (hashing), sesiones httpOnly en BD
- Puerto de desarrollo: `3004`

## Instalación

```bash
npm install
npx prisma migrate deploy   # o: npm run db:migrate en dev
npm run db:seed             # datos DEMO
npm run dev                 # http://localhost:3004
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 3004) |
| `npm run build` / `start` | Build y producción |
| `npm run lint` / `typecheck` | Verificación de calidad |
| `npm run db:migrate` | Crear/aplicar migraciones (dev) |
| `npm run db:seed` | Datos demo (`demo@barberos.pe` / `demo1234`) |
| `npm run db:studio` | Prisma Studio |

## Estructura

```text
src/
├── app/
│   ├── (auth)/          # login, registro de barbería
│   ├── (app)/           # área autenticada (dashboard, configuración)
│   ├── actions/         # Server Actions (auth, negocio)
│   └── api/health/      # health check
├── components/ui/       # componentes reutilizables
├── lib/
│   ├── auth/            # sesiones, RBAC, hashing
│   ├── prisma.ts        # cliente singleton (adapter por DATABASE_URL)
│   └── audit.ts         # auditoría
└── proxy.ts             # guard optimista de sesión (Next 16)
prisma/schema.prisma     # modelo de datos multi-tenant
```

## Multi-tenancy

Cada barbería es un `Tenant`. Todos los datos de negocio llevan `tenantId`
y las consultas se filtran siempre por el tenant del usuario autenticado
(`requireTenant()`). Los usuarios `SUPER_ADMIN` no tienen tenant.

## Fases de desarrollo

1. **Foundation** ✅ — auth, tenants, roles, layout, auditoría
2. **Core** ✅ — sedes, barberos, servicios, horarios, disponibilidad, reservas
3. **CRM** ✅ — clientes, notas
4. **Ventas/caja/comisiones** ✅ — ventas, caja, comisiones
5. **Inventario** ✅ — productos, stock, proveedores
6. **Fidelización/marketing** ✅ — promociones, puntos/millas
7. **WhatsApp/email** ✅ — plantillas, confirmaciones y recordatorios (demo registra en
   `MessageLog`; real via `WHATSAPP_WEBHOOK_URL` + scheduler `/api/reminders/run`)
8. **IA** ✅ — asistente por reglas con datos reales del tenant (sin LLM externo)
9. **Marketplace** ✅ — temas e integraciones

Ver `ARCHITECTURE.md` para decisiones técnicas.
