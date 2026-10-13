import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { ADJUSTMENT_REASONS } from "@/modules/inventory/adjustmentReasons";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { cancelAdjustmentAction, removeAdjustmentLineAction } from "@/app/actions/stockAdjustments";
import { AdjustmentScanner } from "./AdjustmentScanner";
import { ConfirmAdjustmentForm } from "./ConfirmAdjustmentForm";

export const metadata = { title: "Ajuste de stock · Udex" };

const STATUS_TONE = { draft: "warn", confirmed: "ok", cancelled: "neutral" } as const;
const STATUS_LABEL = { draft: "Borrador", confirmed: "Confirmado — el stock ya se corrigió", cancelled: "Cancelado" } as const;

export default async function AdjustmentPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.adjust");
  const { id } = await params;

  const adjustment = await prisma.stockAdjustment.findUnique({
    where: { id },
    include: { warehouse: true, lines: { orderBy: { createdAt: "asc" }, include: { variant: { include: { product: true } } } } },
  });
  if (!adjustment || adjustment.companyId !== ctx.companyId) notFound();
  const isDraft = adjustment.status === "draft";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/stock/ajustes" className="text-sm underline">← Ajustes</Link>
        <PageHeader
          title={`Ajuste · ${adjustment.warehouse.name}`}
          description={`${ADJUSTMENT_REASONS[adjustment.reason]}${adjustment.note ? ` · ${adjustment.note}` : ""}`}
          actions={<Badge tone={STATUS_TONE[adjustment.status]}>{STATUS_LABEL[adjustment.status]}</Badge>}
        />
      </div>

      {isDraft && (
        <Card className="p-5">
          <AdjustmentScanner adjustmentId={adjustment.id} />
        </Card>
      )}

      <Card>
        <div className="flex flex-col divide-y divide-line">
          {adjustment.lines.map((line) => {
            const positive = !line.delta.isNegative();
            return (
              <div key={line.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{line.variant.product.name}</p>
                  <p className="text-xs text-muted">{line.variant.sku}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`tabular text-lg font-semibold ${positive ? "text-ok" : "text-danger"}`}>
                    {positive ? "+" : ""}{line.delta.toString()}
                  </span>
                  {isDraft && (
                    <form action={removeAdjustmentLineAction}>
                      <input type="hidden" name="lineId" value={line.id} />
                      <button type="submit" className="text-sm text-muted underline hover:text-danger">Quitar</button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
          {adjustment.lines.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Todavía no escaneaste nada.</p>}
        </div>
      </Card>

      {isDraft && (
        <div className="flex items-center gap-4">
          <ConfirmAdjustmentForm adjustmentId={adjustment.id} lineCount={adjustment.lines.length} />
          <form action={cancelAdjustmentAction}>
            <input type="hidden" name="adjustmentId" value={adjustment.id} />
            <button type="submit" className="text-sm text-muted underline">Cancelar ajuste</button>
          </form>
        </div>
      )}
    </div>
  );
}
