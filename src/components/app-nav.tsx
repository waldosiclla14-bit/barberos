"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Blocks,
  CalendarDays,
  LayoutDashboard,
  MapPin,
  Package,
  Percent,
  Scissors,
  Settings,
  ShoppingBag,
  Sparkles,
  Tag,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

const ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/agenda": CalendarDays,
  "/clientes": Users,
  "/ventas": ShoppingBag,
  "/caja": Wallet,
  "/inventario": Package,
  "/comisiones": Percent,
  "/promociones": Tag,
  "/notificaciones": Bell,
  "/ia": Sparkles,
  "/marketplace": Blocks,
  "/sedes": MapPin,
  "/servicios": Scissors,
  "/barberos": UserRound,
  "/configuracion": Settings,
};

export function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Menú principal">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = ICONS[item.href] ?? LayoutDashboard;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
              active
                ? "bg-(--accent) text-(--accent-ink) shadow-[0_6px_18px_-8px_var(--accent)]"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.98]",
            )}
          >
            <Icon aria-hidden className="h-4 w-4" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}