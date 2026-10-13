import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { cancelTransferAction, removeTransferLineAction } from "@/app/actions/stockTransfers";
import { TransferScanner } from "./TransferScanner";
import { SendTransferForm } from "./SendTransferForm";
import { ReceiveTransferForm } from "./ReceiveTransferForm";

export const metadata = { title: "Transferencia · Udex" };

const STATUS_TONE = { draft: "warn", sent: "accent", received: "ok", cancelled: "neutral" } as const;
const STATUS_LABEL = { draft: "Borrador", sent: "Esperando recepción", received: "Recibida", cancelled: "Cancelada" } as const;

export default async function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.transfer");
  const { id } = await params;

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: { fromWarehouse: true, toWarehouse: true, lines: { orderBy: { createdAt: "asc" }, include: { variant: { include: { product: true } } } } },
  });
  if (!transfer || transfer.companyId !== ctx.companyId) notFound();
  const isDraft = transfer.status === "draft";
  const isSent = transfer.status === "sent";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/stock/transferencias" className="text-sm underline">← Transferencias</Link>
        <PageHeader
          title={`${transfer.fromWarehouse.name} → ${transfer.toWarehouse.name}`}
          description={transfer.note ?? undefined}
          actions={<Badge tone={STATUS_TONE[transfer.status]}>{STATUS_LABEL[transfer.status]}</Badge>}
        />
      </div>

      {isDraft && (
        <Card className="p-5">
          <TransferScanner transferId={transfer.id} />
        </Card>
      )}

      {isSent && (
        <Card className="p-5">
          <ReceiveTransferForm
            transferId={transfer.id}
            lines={transfer.lines.map((l) => ({ id: l.id, productName: l.variant.product.name, sku: l.variant.sku, quantity: l.quantity.toString() }))}
          />
        </Card>
      )}

      {(isDraft || transfer.status === "received") && (
        <Card>
          <div className="flex flex-col divide-y divide-line">
            {transfer.lines.map((line) => {
              const diff = line.receivedQuantity !== null ? line.receivedQuantity.minus(line.quantity) : null;
              return (
                <div key={line.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{line.variant.product.name}</p>
                    <p className="text-xs text-muted">{line.variant.sku}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular text-lg font-semibold">
                      {line.receivedQuantity !== null ? line.receivedQuantity.toString() : line.quantity.toString()}
                    </span>
                    {diff && !diff.isZero() && <Badge tone="warn">{diff.isNegative() ? "" : "+"}{diff.toString()} vs. enviado</Badge>}
                    {isDraft && (
                      <form action={removeTransferLineAction}>
                        <input type="hidden" name="lineId" value={line.id} />
                        <button type="submit" className="text-sm text-muted underline hover:text-danger">Quitar</button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
            {transfer.lines.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Todavía no escaneaste nada.</p>}
          </div>
        </Card>
      )}

      {isDraft && (
        <div className="flex items-center gap-4">
          <SendTransferForm transferId={transfer.id} lineCount={transfer.lines.length} />
          <form action={cancelTransferAction}>
            <input type="hidden" name="transferId" value={transfer.id} />
            <button type="submit" className="text-sm text-muted underline">Cancelar</button>
          </form>
        </div>
      )}
    </div>
  );
}
