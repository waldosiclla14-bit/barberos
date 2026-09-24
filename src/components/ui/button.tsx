import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-(--accent) text-white hover:brightness-90 focus-visible:ring-(--accent) disabled:bg-zinc-400",
  secondary:
    "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 focus-visible:ring-(--accent)/40",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600/30",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-70";

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(base, variants[variant], className)} {...props} />;
}
