export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const PEN = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export function formatPEN(amount: number): string {
  return PEN.format(amount);
}
