import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Udex",
  description: "ERP multirubro con facturación electrónica ARCA",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
