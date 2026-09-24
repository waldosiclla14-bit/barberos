import { getAuthContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { getAvailability, MAX_ADVANCE_DAYS } from "@/lib/scheduling/availability";
import { addDaysToKey, todayLima } from "@/lib/scheduling/time";

export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth?.tenant) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, "appointments:view")) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch");
  const date = url.searchParams.get("date");
  const services = url.searchParams.get("services");
  const barber = url.searchParams.get("barber");

  if (!branchId || !date || !services) {
    return Response.json(
      { error: "Requerido: branch, date (YYYY-MM-DD), services (csv)" },
      { status: 400 },
    );
  }

  const serviceIds = services.split(",").map((s) => s.trim()).filter(Boolean);
  if (serviceIds.length === 0) {
    return Response.json({ error: "Al menos un servicio" }, { status: 400 });
  }

  const today = todayLima();
  if (date < today || date > addDaysToKey(today, MAX_ADVANCE_DAYS)) {
    return Response.json(
      { error: `Fecha fuera de rango (hoy a +${MAX_ADVANCE_DAYS} días)` },
      { status: 400 },
    );
  }

  try {
    const availability = await getAvailability({
      tenantId: auth.tenant.id,
      branchId,
      dateKey: date,
      serviceIds,
      barberId: barber || null,
    });
    return Response.json(availability);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error de disponibilidad";
    return Response.json({ error: message }, { status: 400 });
  }
}
