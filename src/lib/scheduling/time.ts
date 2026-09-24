// Utilidades de tiempo en zona America/Lima (UTC-5, sin DST).
// Todos los timestamps se almacenan en UTC (Date); los horarios de trabajo
// se expresan en minutos desde medianoche hora Lima.

export const LIMA_TZ = "America/Lima";
const LIMA_OFFSET_MIN = 300; // Lima = UTC-5

export interface LimaParts {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0=domingo .. 6=sabado
  minutes: number; // minutos desde medianoche Lima
}

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LIMA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  weekday: "short",
});

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Descompone un Date en partes de calendario Lima. */
export function toLimaParts(date: Date): LimaParts {
  const parts = partsFormatter.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  return {
    year,
    month,
    day,
    weekday: WEEKDAYS[get("weekday")] ?? 0,
    minutes: hour * 60 + minute,
  };
}

/** Construye un Date UTC a partir de fecha/hora wall-clock de Lima. */
export function limaToUTC(
  year: number,
  month: number,
  day: number,
  minutes: number,
): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, minutes + LIMA_OFFSET_MIN));
}

/** "2026-08-25" -> {y, m, d}. */
export function parseDateKey(key: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/** Inicio (00:00) y fin (24:00) del día Lima como Dates UTC. */
export function limaDayRange(dateKey: string): { start: Date; end: Date } | null {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  const start = limaToUTC(parsed.y, parsed.m, parsed.d, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Date -> "YYYY-MM-DD" en calendario Lima. */
export function toLimaDateKey(date: Date): string {
  const p = toLimaParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Hoy en Lima como "YYYY-MM-DD". */
export function todayLima(): string {
  return toLimaDateKey(new Date());
}

export function formatHHmm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Minutos -> "HH:mm" (para inputs type=time). */
export const minutesToHHmm = formatHHmm;

export function parseHHmm(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function addDaysToKey(dateKey: string, days: number): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) throw new Error(`Fecha inválida: ${dateKey}`);
  const base = Date.UTC(parsed.y, parsed.m - 1, parsed.d);
  const next = new Date(base + days * 24 * 60 * 60 * 1000);
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export function weekdayOfKey(dateKey: string): number {
  const parsed = parseDateKey(dateKey);
  if (!parsed) throw new Error(`Fecha inválida: ${dateKey}`);
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).getUTCDay();
}

/** ¿El rango A choca con el rango B? (solapamiento estricto) */
export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
