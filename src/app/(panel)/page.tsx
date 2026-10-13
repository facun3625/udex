import { requireContext } from "@/modules/core/context";
import { daysUntilExpiry } from "@/modules/core/modules";

export default async function HomePage() {
  const ctx = await requireContext();
  const days = daysUntilExpiry(ctx.license);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Hola, {ctx.user.name.split(" ")[0]}</h1>
      {ctx.user.isSuperadmin && !ctx.license.configured && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Esta instalación no tiene licencia configurada: están habilitados todos los módulos.{" "}
          <a href="/superadmin/licencia" className="underline">Configurar licencia</a>
        </p>
      )}
      {days !== null && days > 0 && days <= 15 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          La licencia vence en {days} {days === 1 ? "día" : "días"}.
        </p>
      )}
      <p className="text-neutral-600">El sistema está en construcción. Próximo: stock con código de barras.</p>
    </div>
  );
}
