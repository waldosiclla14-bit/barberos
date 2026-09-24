import { runRemindersForAllTenants } from "@/lib/notifications";

// Endpoint para schedulers externos (Vercel Cron, GitHub Actions, crontab).
// Asegurar con: Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json({ error: "CRON_SECRET no configurado" }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  if (header !== `Bearer ${expected}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const result = await runRemindersForAllTenants();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("[api/reminders/run]", error);
    return Response.json({ ok: false, error: "Fallo interno" }, { status: 500 });
  }
}