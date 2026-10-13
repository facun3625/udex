import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { createReceiptAction } from "@/app/actions/stockReceipts";

export const metadata = { title: "Ingresos de mercadería · Udex" };

const dateFmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });
const STATUS_TONE = { draft: "warn", confirmed: "ok", cancelled: "neutral" } as const;
const STATUS_LABEL = { draft: "Borrador", confirmed: "Confirmado", cancelled: "Cancelado" } as const;

export default async function ReceiptsListPage() {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.receive");

  const receipts = await prisma.stockReceipt.findMany({
    where: { companyId: ctx.companyId },
    include: { warehouse: true, _count: { select: { lines: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const columns: Column<(typeof receipts)[number]>[] = [
    { key: "date", header: "Fecha", cell: (r) => <span className="tabular whitespace-nowrap">{dateFmt.format(r.createdAt)}</span> },
    { key: "warehouse", header: "Depósito", cell: (r) => r.warehouse.name },
    { key: "supplier", header: "Proveedor", cell: (r) => r.supplierName ?? "—", className: "hidden sm:table-cell" },
    { key: "lines", header: "Líneas", cell: (r) => r._count.lines, align: "right" },
    { key: "status", header: "Estado", cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
    { key: "open", header: "", align: "right", cell: (r) => <Link href={`/stock/ingresos/${r.id}`} className="text-sm underline">Abrir</Link> },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Ingresos de mercadería"
        description="Escaneá cada producto a medida que llega: el stock sube al confirmar."
        actions={
          <form action={createReceiptAction}>
            <Button type="submit">Nuevo ingreso</Button>
          </form>
        }
      />
      <Card>
        <DataTable columns={columns} rows={receipts} rowKey={(r) => r.id} empty={{ title: "Todavía no hay ingresos", description: 'Tocá "Nuevo ingreso" para empezar a escanear.' }} />
      </Card>
    </div>
  );
}
