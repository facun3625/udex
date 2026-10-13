import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { ADJUSTMENT_REASONS } from "@/modules/inventory/adjustmentReasons";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LinkButton } from "@/components/ui/Button";

export const metadata = { title: "Ajustes de stock · Udex" };

const dateFmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });
const STATUS_TONE = { draft: "warn", confirmed: "ok", cancelled: "neutral" } as const;
const STATUS_LABEL = { draft: "Borrador", confirmed: "Confirmado", cancelled: "Cancelado" } as const;

export default async function AdjustmentsListPage() {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.adjust");

  const rows = await prisma.stockAdjustment.findMany({
    where: { companyId: ctx.companyId },
    include: { warehouse: true, _count: { select: { lines: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const columns: Column<(typeof rows)[number]>[] = [
    { key: "date", header: "Fecha", cell: (r) => <span className="tabular whitespace-nowrap">{dateFmt.format(r.createdAt)}</span> },
    { key: "warehouse", header: "Depósito", cell: (r) => r.warehouse.name },
    { key: "reason", header: "Motivo", cell: (r) => ADJUSTMENT_REASONS[r.reason] },
    { key: "lines", header: "Líneas", cell: (r) => r._count.lines, align: "right" },
    { key: "status", header: "Estado", cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
    { key: "open", header: "", align: "right", cell: (r) => <Link href={`/stock/ajustes/${r.id}`} className="text-sm underline">Abrir</Link> },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader title="Ajustes de stock" description="Correcciones manuales: rotura, robo, obsequio o un error de carga anterior." actions={<LinkButton href="/stock/ajustes/nuevo">Nuevo ajuste</LinkButton>} />
      <Card>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} empty={{ title: "Todavía no hay ajustes" }} />
      </Card>
    </div>
  );
}
