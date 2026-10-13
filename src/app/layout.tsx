import type { Metadata } from "next";
import { cookies } from "next/headers";
import { parseTheme, SYSTEM_THEME_SCRIPT, THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Udex",
  description: "ERP multirubro con facturación electrónica ARCA",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="es-AR" className={theme === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <head>{theme === "system" && <script dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} />}</head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
