import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "BARBEROS — El sistema operativo para barberías",
    template: "%s · BARBEROS",
  },
  description:
    "Gestiona reservas, clientes, barberos, caja y ventas de tu barbería desde un solo lugar. Prueba gratis, en español y con moneda en soles (S/).",
  keywords: [
    "barbería",
    "sistema para barberías",
    "reservas barbería",
    "gestión barbería",
    "punto de venta barbería",
    "software barbería Perú",
    "agenda barbería",
  ],
  authors: [{ name: "BARBEROS" }],
  creator: "BARBEROS",
  metadataBase: new URL("https://barberos.pe"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: "/",
    siteName: "BARBEROS",
    title: "BARBEROS — El sistema operativo para barberías",
    description:
      "Reservas online, clientes, barberos, caja y ventas en un solo lugar. Prueba gratis.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BARBEROS — El sistema operativo para barberías",
    description:
      "Reservas online, clientes, barberos, caja y ventas en un solo lugar.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0e",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
