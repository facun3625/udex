import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { removeReceiptLineAction, cancelReceiptAction } from "@/app/actions/stockReceipts";
import { ReceiptScanner } from "./ReceiptScanner";
import { ConfirmReceiptForm } from "./ConfirmReceiptForm";

export const metadata = { title: "Ingreso de mercadería · Udex" };

const STATUS_TONE = { draft: "warn", confirmed: "ok", cancelled: "neutral" } as const;
const STATUS_LABEL = { draft: "Borrador", confirmed: "Confirmado — el stock ya se actualizó", cancelled: "Cancelado" } as const;

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.receive");
  const { id } = await params;

  const receipt = await prisma.stockReceipt.findUnique({
    where: { id },
    include: {
      warehouse: true,
      lines: { orderBy: { createdAt: "asc" }, include: { variant: { include: { product: true } } } },
    },
  });
  if (!receipt || receipt.companyId !== ctx.companyId) notFound();
  const isDraft = receipt.status === "draft";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/stock/ingresos" className="text-sm underline">← Ingresos</Link>
        <PageHeader
          title={`Ingreso · ${receipt.warehouse.name}`}
          actions={<Badge tone={STATUS_TONE[receipt.status]}>{STATUS_LABEL[receipt.status]}</Badge>}
        />
      </div>

      {isDraft && (
        <Card className="p-5">
          <ReceiptScanner receiptId={receipt.id} />
        </Card>
      )}

      <Card>
        <div className="flex flex-col divide-y divide-line">
          {receipt.lines.map((line) => (
            <div key={line.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="font-medium">{line.variant.product.name}</p>
                <p className="text-xs text-muted">{line.variant.sku}{line.scannedCode && line.scannedCode !== line.variant.sku ? ` · leído: ${line.scannedCode}` : ""}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="tabular text-lg font-semibold">{line.quantity.toString()}</span>
                {isDraft && (
                  <form action={removeReceiptLineAction}>
                    <input type="hidden" name="lineId" value={line.id} />
                    <button type="submit" className="text-sm text-muted underline hover:text-danger">Quitar</button>
                  </form>
                )}
              </div>
            </div>
          ))}
          {receipt.lines.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Todavía no escaneaste nada.</p>}
        </div>
      </Card>

      {isDraft && (
        <div className="flex items-center gap-4">
          <ConfirmReceiptForm receiptId={receipt.id} lineCount={receipt.lines.length} />
          <form action={cancelReceiptAction}>
            <input type="hidden" name="receiptId" value={receipt.id} />
            <button type="submit" className="text-sm text-muted underline">Cancelar ingreso</button>
          </form>
        </div>
      )}
    </div>
  );
}
