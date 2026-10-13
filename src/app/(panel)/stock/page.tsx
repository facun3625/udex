import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { can, requireContext } from "@/modules/core/context";
import { PageHeader } from "@/components/ui/Card";

export const metadata = { title: "Stock · Udex" };

export default async function StockHubPage() {
  const ctx = await requireContext();
  const cards = [
    { href: "/stock/ingresos", icon: PackagePlus, title: "Ingreso de mercadería", description: "Escaneá lo que llega y sumá la cantidad", visible: can(ctx, "stock.receive") },
  ].filter((c) => c.visible);

  return (
    <div>
      <PageHeader title="Stock" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-5 hover:border-accent">
            <c.icon className="size-5 shrink-0 text-accent" />
            <div>
              <p className="font-medium">{c.title}</p>
              <p className="text-sm text-muted">{c.description}</p>
            </div>
          </Link>
        ))}
        {cards.length === 0 && <p className="text-sm text-muted">No tenés permiso para administrar stock.</p>}
      </div>
    </div>
  );
}
