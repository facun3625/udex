import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LinkButton } from "@/components/ui/Button";

export const metadata = { title: "Transferencias · Udex" };

const dateFmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });
const STATUS_TONE = { draft: "warn", sent: "accent", received: "ok", cancelled: "neutral" } as const;
const STATUS_LABEL = { draft: "Borrador", sent: "Esperando recepción", received: "Recibida", cancelled: "Cancelada" } as const;

export default async function TransfersListPage() {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.transfer");

  const rows = await prisma.stockTransfer.findMany({
    where: { companyId: ctx.companyId },
    include: { fromWarehouse: true, toWarehouse: true, _count: { select: { lines: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const columns: Column<(typeof rows)[number]>[] = [
    { key: "date", header: "Fecha", cell: (r) => <span className="tabular whitespace-nowrap">{dateFmt.format(r.createdAt)}</span> },
    { key: "route", header: "Ruta", cell: (r) => <span>{r.fromWarehouse.name} → {r.toWarehouse.name}</span> },
    { key: "lines", header: "Líneas", cell: (r) => r._count.lines, align: "right" },
    { key: "status", header: "Estado", cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
    { key: "open", header: "", align: "right", cell: (r) => <Link href={`/stock/transferencias/${r.id}`} className="text-sm underline">Abrir</Link> },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader title="Transferencias" description="Traslados de mercadería entre los depósitos de la empresa." actions={<LinkButton href="/stock/transferencias/nuevo">Nueva transferencia</LinkButton>} />
      <Card>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} empty={{ title: "Todavía no hay transferencias" }} />
      </Card>
    </div>
  );
}
