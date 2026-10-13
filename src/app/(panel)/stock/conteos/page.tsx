import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { createCountAction } from "@/app/actions/stockCounts";

export const metadata = { title: "Conteos de stock · Udex" };

const dateFmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });
const STATUS_TONE = { counting: "warn", confirmed: "ok", cancelled: "neutral" } as const;
const STATUS_LABEL = { counting: "Contando", confirmed: "Cerrado", cancelled: "Cancelado" } as const;

export default async function CountsListPage() {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.count");

  const rows = await prisma.stockCount.findMany({
    where: { companyId: ctx.companyId },
    include: { warehouse: true, _count: { select: { lines: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const columns: Column<(typeof rows)[number]>[] = [
    { key: "date", header: "Fecha", cell: (r) => <span className="tabular whitespace-nowrap">{dateFmt.format(r.createdAt)}</span> },
    { key: "warehouse", header: "Depósito", cell: (r) => r.warehouse.name },
    { key: "lines", header: "Productos contados", cell: (r) => r._count.lines, align: "right" },
    { key: "status", header: "Estado", cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
    { key: "open", header: "", align: "right", cell: (r) => <Link href={`/stock/conteos/${r.id}`} className="text-sm underline">Abrir</Link> },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Conteos de stock"
        description="Varias personas pueden escanear al mismo conteo a la vez, cada una desde su celular."
        actions={<form action={createCountAction}><Button type="submit">Nuevo conteo</Button></form>}
      />
      <Card>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} empty={{ title: "Todavía no hay conteos" }} />
      </Card>
    </div>
  );
}
