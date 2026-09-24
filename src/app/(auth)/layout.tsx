import type { CSSProperties, ReactNode } from "react";

// Marca global pre-tenant: oro de BARBEROS sobre fondo oscuro.
const goldStyle = {
  "--accent": "var(--gold)",
  "--accent-ink": "#1c1917",
  "--accent-bright": "var(--gold-bright)",
} as CSSProperties;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[--dark-bg] px-6 py-16"
      style={goldStyle}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 360px at 50% -10%, rgba(201,162,39,0.16), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-fade-in"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(circle at 50% 30%, black, transparent 80%)",
        }}
      />
      <div className="relative w-full max-w-md animate-fade-up">{children}</div>
    </main>
  );
}