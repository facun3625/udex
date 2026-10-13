import Link from "next/link";
import { requireContext, requirePermission } from "@/modules/core/context";
import { Card, PageHeader } from "@/components/ui/Card";
import { NewAdjustmentForm } from "./NewAdjustmentForm";

export const metadata = { title: "Nuevo ajuste · Udex" };

export default async function NewAdjustmentPage() {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.adjust");
  return (
    <div className="max-w-xl">
      <Link href="/stock/ajustes" className="text-sm underline">← Ajustes</Link>
      <PageHeader title="Nuevo ajuste de stock" description="Para corregir un error, una rotura, un robo o un obsequio. No es para ingresar mercadería nueva: eso va por Stock → Ingreso." />
      <Card className="p-5">
        <NewAdjustmentForm />
      </Card>
    </div>
  );
}
