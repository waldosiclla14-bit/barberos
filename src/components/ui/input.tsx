import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldVariant = "light" | "dark";

const fieldByVariant: Record<FieldVariant, string> = {
  light:
    "border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-(--accent) focus:ring-(--accent)/10",
  dark: "border-white/15 bg-white/[0.06] text-white placeholder:text-zinc-500 focus:border-(--accent-bright) focus:ring-(--accent-bright)/20",
};

const baseField =
  "w-full rounded-lg border px-3 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: FieldVariant;
}

export function Input({ className, variant = "light", ...props }: InputProps) {
  return (
    <input
      className={cn(baseField, fieldByVariant[variant], "h-11", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  variant = "light",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { variant?: FieldVariant }) {
  return (
    <textarea
      className={cn(baseField, fieldByVariant[variant], "min-h-24 py-2", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  variant = "light",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { variant?: FieldVariant }) {
  return (
    <select
      className={cn(baseField, fieldByVariant[variant], "h-11", className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-zinc-700", className)}
      {...props}
    />
  );
}

export function FieldError({ className, children }: { className?: string; children?: string }) {
  if (!children) return null;
  return <p className={cn("mt-1.5 text-sm text-red-600", className)}>{children}</p>;
}