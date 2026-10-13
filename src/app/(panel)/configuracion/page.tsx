import Link from "next/link";
import { Building2, ShieldCheck, Users } from "lucide-react";
import { can, requireContext } from "@/modules/core/context";
import { PageHeader } from "@/components/ui/Card";

export const metadata = { title: "Configuración · Udex" };

export default async function ConfigHubPage() {
  const ctx = await requireContext();

  const cards = [
    { href: "/configuracion/empresa", icon: Building2, title: "Empresa y sucursales", description: "Datos fiscales, sucursales y depósitos", visible: can(ctx, "settings.manage") },
    { href: "/configuracion/usuarios", icon: Users, title: "Usuarios", description: "Quién puede entrar y qué puede hacer", visible: can(ctx, "users.manage") },
    { href: "/configuracion/roles", icon: ShieldCheck, title: "Roles y permisos", description: "Roles del sistema y roles propios", visible: can(ctx, "users.manage") },
  ].filter((c) => c.visible);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Configuración" />
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-5 hover:border-accent">
            <c.icon className="size-5 shrink-0 text-accent" />
            <div>
              <p className="font-medium">{c.title}</p>
              <p className="text-sm text-muted">{c.description}</p>
            </div>
          </Link>
        ))}
        {cards.length === 0 && <p className="text-sm text-muted">No tenés permiso para configurar nada acá.</p>}
      </div>
    </div>
  );
}
