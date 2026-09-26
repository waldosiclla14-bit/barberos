// RBAC — Roles y permisos de BARBEROS
// Los roles se almacenan como String en BD (portable SQLite→PostgreSQL)
// y se validan con este módulo. Fuente única de verdad.

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  BARBER: "BARBER",
  RECEPTIONIST: "RECEPTIONIST",
  CUSTOMER: "CUSTOMER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  OWNER: "Dueño",
  MANAGER: "Administrador de sede",
  BARBER: "Barbero",
  RECEPTIONIST: "Recepcionista",
  CUSTOMER: "Cliente",
};

// Permisos por módulo. Se irán ampliando en fases posteriores.
export const PERMISSIONS = [
  // Dashboard
  "dashboard:view",
  "dashboard:platform", // panel global SUPER_ADMIN
  // Configuración del negocio
  "settings:view",
  "settings:manage",
  // Usuarios
  "users:view",
  "users:manage",
  // Catálogos core
  "branches:view",
  "barbers:view",
  "services:view",
  "branches:manage",
  "barbers:manage",
  "services:manage",
  // Módulos futuros (FASE 3+)
  "appointments:view",
  "appointments:manage",
  "customers:view",
  "customers:manage",
  "sales:create",
  "sales:view",
  "cash:manage",
  "reports:view",
  // Inventario (FASE 5)
  "inventory:view",
  "inventory:manage",
  // Fidelización y marketing (FASE 6)
  "promotions:view",
  "promotions:manage",
  // Asistente IA (FASE 8)
  "ai:view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: ["dashboard:platform"],
  OWNER: ALL,
  MANAGER: [
    "dashboard:view",
    "settings:view",
    "users:view",
    "branches:view",
    "branches:manage",
    "barbers:view",
    "barbers:manage",
    "services:view",
    "services:manage",
    "appointments:view",
    "appointments:manage",
    "customers:view",
    "customers:manage",
    "sales:create",
    "sales:view",
    "cash:manage",
    "reports:view",
    "inventory:view",
    "inventory:manage",
    "promotions:view",
    "promotions:manage",
    "ai:view",
  ],
  BARBER: [
    "dashboard:view",
    "barbers:view",
    "services:view",
    "appointments:view",
    "customers:view",
    "sales:create",
    "sales:view",
    "inventory:view",
    "promotions:view",
    "ai:view",
  ],
  RECEPTIONIST: [
    "dashboard:view",
    "branches:view",
    "barbers:view",
    "services:view",
    "appointments:view",
    "appointments:manage",
    "customers:view",
    "customers:manage",
    "sales:create",
    "inventory:view",
    "promotions:view",
    "ai:view",
  ],
  CUSTOMER: [],
};

export function isRole(value: string): value is Role {
  return Object.values(ROLES).includes(value as Role);
}

export function hasPermission(role: string, permission: Permission): boolean {
  if (!isRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}
