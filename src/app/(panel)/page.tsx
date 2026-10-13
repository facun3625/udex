import { requireContext } from "@/modules/core/context";
import { daysUntilExpiry } from "@/modules/core/modules";
import { Alert, Card, PageHeader } from "@/components/ui/Card";

export default async function HomePage() {
  const ctx = await requireContext();
  const days = daysUntilExpiry(ctx.license);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageHeader title={`Hola, ${ctx.user.name.split(" ")[0]}`} description="Resumen del día" />
      {ctx.user.isSuperadmin && !ctx.license.configured && (
        <Alert>
          Esta instalación no tiene licencia configurada: están habilitados todos los módulos.{" "}
          <a href="/superadmin/licencia" className="font-medium underline">Configurar licencia</a>
        </Alert>
      )}
      {days !== null && days > 0 && days <= 15 && <Alert>La licencia vence en {days} {days === 1 ? "día" : "días"}.</Alert>}
      <Card className="p-6 text-sm text-muted">
        Acá van a aparecer las ventas del día, el stock bajo y los pendientes. Próximo paso: stock con código de barras.
      </Card>
    </div>
  );
}
