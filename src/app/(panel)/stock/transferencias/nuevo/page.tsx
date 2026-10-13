import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { Card, PageHeader } from "@/components/ui/Card";
import { NewTransferForm } from "./NewTransferForm";

export const metadata = { title: "Nueva transferencia · Udex" };

export default async function NewTransferPage() {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.transfer");

  const origin = await prisma.warehouse.findFirst({ where: { companyId: ctx.companyId, branchId: ctx.branchId, isBranchDefault: true, active: true } });
  if (!origin) notFound();
  const others = await prisma.warehouse.findMany({ where: { companyId: ctx.companyId, active: true, id: { not: origin.id } }, orderBy: { name: "asc" } });

  return (
    <div className="max-w-xl">
      <Link href="/stock/transferencias" className="text-sm underline">← Transferencias</Link>
      <PageHeader title="Nueva transferencia" description="Para mandar mercadería a otro depósito de la empresa." />
      <Card className="p-5">
        {others.length === 0 ? (
          <p className="text-sm text-muted">Esta empresa todavía no tiene otro depósito activo a donde transferir.</p>
        ) : (
          <NewTransferForm warehouses={others} originName={origin.name} />
        )}
      </Card>
    </div>
  );
}
