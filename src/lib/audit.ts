import { prisma } from "@/lib/prisma";

interface AuditEntry {
  userId?: string | null;
  tenantId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

/**
 * Registra operaciones importantes (seccion 69).
 * Nunca lanza: la auditoría no debe romper el flujo de negocio.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        tenantId: entry.tenantId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ip: entry.ip ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] No se pudo registrar la operación:", error);
  }
}
