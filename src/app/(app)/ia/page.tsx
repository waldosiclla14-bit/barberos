import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { askAssistant } from "@/lib/ia";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { AssistantChat } from "./assistant-chat";

export const metadata: Metadata = {
  title: "Asistente IA",
};

export const dynamic = "force-dynamic";

export default async function IaPage() {
  const auth = await requirePermission("ai:view");

  const [trends, promos, stock] = await Promise.all([
    askAssistant(auth.tenant.id, auth.tenant.name, "¿Cuál es el top y qué recomiendas?"),
    askAssistant(auth.tenant.id, auth.tenant.name, "promociones activas"),
    askAssistant(auth.tenant.id, auth.tenant.name, "alertas de inventario bajo"),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Asistente IA
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Informa del negocio con datos reales: recomendaciones, stocks, promos y agenda.
          (Demo: motor por reglas, sin LLM externo).
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Chatea con tu negocio</CardTitle>
          </CardHeader>
          <CardBody>
            <AssistantChat />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recomendaciones</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="whitespace-pre-line text-sm text-zinc-700">
                {trends.text}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Promociones</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="whitespace-pre-line text-sm text-zinc-700">
                {promos.text}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Inventario</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="whitespace-pre-line text-sm text-zinc-700">
                {stock.text}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}