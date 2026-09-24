import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "ghost-light";

const variants: Record<Variant, string> = {
  primary:
    "bg-(--accent) text-(--accent-ink) hover:brightness-105 hover:shadow-[0_10px_28px_-12px_var(--accent)] focus-visible:ring-(--accent)/40 disabled:bg-zinc-400 disabled:shadow-none",
  secondary:
    "border border-zinc-300 bg-white text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50 focus-visible:ring-(--accent)/40",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600/30",
  outline:
    "border border-white/25 text-white hover:border-white/40 hover:bg-white/10 focus-visible:ring-white/40",
  "ghost-light": "text-zinc-300 hover:bg-white/10 hover:text-white",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70";

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(base, variants[variant], className)} {...props} />;
}