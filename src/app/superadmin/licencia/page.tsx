import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/modules/core/context";
import { MODULES, ALL_MODULES } from "@/modules/core/modules";
import { LicenseForm } from "./LicenseForm";

export const metadata = { title: "Licencia · Udex" };

// Solo el superadmin. Fuera del panel (no necesita empresa elegida: se usa también al instalar).
export default async function LicensePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isSuperadmin) notFound();

  const row = await prisma.installationLicense.findUnique({ where: { id: "installation" } });
  const enabled = new Set(row ? row.modules : ALL_MODULES);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm underline">← Volver</Link>
      <h1 className="mt-3 text-2xl font-semibold">Licencia de la instalación</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {row ? "Configurada." : "Sin configurar: hoy están habilitados todos los módulos."} Solo la ve el superadmin.
      </p>
      <LicenseForm
        modules={ALL_MODULES.map((k) => ({ key: k, label: MODULES[k], enabled: enabled.has(k) }))}
        values={{
          clientName: row?.clientName ?? "",
          plan: row?.plan ?? "",
          maxCompanies: row?.maxCompanies ?? null,
          maxBranches: row?.maxBranches ?? null,
          maxUsers: row?.maxUsers ?? null,
          expiresAt: row?.expiresAt
            ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(row.expiresAt)
            : "",
        }}
      />
    </main>
  );
}
