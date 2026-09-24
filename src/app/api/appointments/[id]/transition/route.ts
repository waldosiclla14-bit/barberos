import { getAuthContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { transitionAppointment, type Transition } from "@/lib/scheduling/appointments";

const VALID: Transition[] = [
  "CHECK_IN",
  "START_SERVICE",
  "COMPLETE_SERVICE",
  "CANCEL",
  "NO_SHOW",
  "RECONFIRM",
];

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthContext();
  if (!auth?.tenant) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, "appointments:manage")) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await ctx.params;
  let body: { transition?: string; cancelReason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const transition = body.transition as Transition | undefined;
  if (!transition || !VALID.includes(transition)) {
    return Response.json({ error: `transition debe ser: ${VALID.join(", ")}` }, { status: 400 });
  }

  const result = await transitionAppointment(auth.tenant.id, id, transition, {
    userId: auth.user.id,
    cancelReason: body.cancelReason,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 409 });
  }
  return Response.json({ ok: true });
}
