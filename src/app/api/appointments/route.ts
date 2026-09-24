import { getAuthContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { createAppointmentSafe } from "@/lib/scheduling/appointments";
import { sendAppointmentConfirmation } from "@/lib/notifications";

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth?.tenant) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, "appointments:manage")) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const startsAtRaw = typeof b.startsAt === "string" ? new Date(b.startsAt) : null;
  if (
    !b.branchId || !b.barberId ||
    !Array.isArray(b.serviceIds) || b.serviceIds.length === 0 ||
    !startsAtRaw || Number.isNaN(startsAtRaw.getTime())
  ) {
    return Response.json(
      { error: "Requerido: branchId, barberId, serviceIds[], startsAt (ISO)" },
      { status: 400 },
    );
  }

  const customer = (b.customer ?? {}) as { id?: string; name?: string; phone?: string };
  if (!customer.id && !(customer.name && customer.phone)) {
    return Response.json(
      { error: "customer: {id} o {name+phone} requerido" },
      { status: 400 },
    );
  }

  const result = await createAppointmentSafe({
    tenantId: auth.tenant.id,
    branchId: String(b.branchId),
    barberId: String(b.barberId),
    serviceIds: b.serviceIds.map(String),
    startsAt: startsAtRaw,
    customer,
    source: "INTERNAL",
    notes: typeof b.notes === "string" ? b.notes : undefined,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 409 });
  }
  await sendAppointmentConfirmation(auth.tenant.id, result.appointmentId);
  return Response.json({ ok: true, appointmentId: result.appointmentId }, { status: 201 });
}
