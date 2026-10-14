import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { cookies } from "next/headers";
import { parseTheme, SYSTEM_THEME_SCRIPT, THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

// Tipografía de toda la app: la misma familia que el logo (ver docs/udex.svg y
// src/components/brand/Wordmark.tsx, que hereda este peso en vez de fijar el suyo propio).
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: "variable", // Montserrat es de peso variable; pedir varios pesos sueltos (["400","600",...])
  // rompe con Turbopack en esta versión de Next ("next/font/google queries have exactly one entry").
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Udex",
  description: "ERP multirubro con facturación electrónica ARCA",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="es-AR" className={`${montserrat.variable} ${theme === "dark" ? "dark" : ""}`} suppressHydrationWarning>
      <head>{theme === "system" && <script dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} />}</head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
