import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  CHECKED_IN: "bg-purple-100 text-purple-800 border-purple-200",
  IN_SERVICE: "bg-indigo-600 text-white border-indigo-700",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-zinc-200 text-zinc-500 border-zinc-300 line-through",
  NO_SHOW: "bg-red-100 text-red-700 border-red-200",
};

const LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CHECKED_IN: "En espera",
  IN_SERVICE: "En servicio",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        STYLES[status] ?? "border-zinc-200 bg-zinc-100 text-zinc-600",
      )}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
