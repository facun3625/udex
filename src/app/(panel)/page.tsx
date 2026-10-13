import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { can, hasModule, requireContext } from "@/modules/core/context";
import { daysUntilExpiry } from "@/modules/core/modules";
import { MENU, visibleMenu } from "@/modules/core/menu";
import { Alert, Card, PageHeader } from "@/components/ui/Card";
import { MENU_ICONS } from "@/components/panel/icons";

export default async function HomePage() {
  const ctx = await requireContext();
  const days = daysUntilExpiry(ctx.license);

  // Accesos rápidos: lo mismo que el menú (ya filtrado por permiso y módulo), sin "Inicio" y sin lo que
  // todavía no está construido. Se arma solo a medida que se suman pantallas, sin tocar esta página.
  const quickLinks = visibleMenu(MENU, (p) => can(ctx, p), (m) => hasModule(ctx, m)).filter((i) => i.ready && i.href !== "/");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Hola, ${ctx.user.name.split(" ")[0]}`} description="Resumen del día" />

      {ctx.user.isSuperadmin && !ctx.license.configured && (
        <Alert>
          Esta instalación no tiene licencia configurada: están habilitados todos los módulos.{" "}
          <a href="/superadmin/licencia" className="font-medium underline">Configurar licencia</a>
        </Alert>
      )}
      {days !== null && days > 0 && days <= 15 && <Alert>La licencia vence en {days} {days === 1 ? "día" : "días"}.</Alert>}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted">Resumen</h2>
        <Card className="p-6 text-sm text-muted">
          Acá van a aparecer las ventas del día, el stock bajo y los pendientes a medida que se construyan esos módulos.
        </Card>
      </section>

      {quickLinks.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted">Accesos rápidos</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {quickLinks.map((item) => {
              const Icon = MENU_ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(16,16,12,0.04)] transition-colors hover:border-accent"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 font-medium">{item.label}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
            {ctx.user.isSuperadmin && (
              <Link
                href="/superadmin/licencia"
                className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(16,16,12,0.04)] transition-colors hover:border-accent"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <ShieldCheck className="size-5" />
                </span>
                <span className="min-w-0 flex-1 font-medium">Licencia</span>
                <ArrowRight className="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
