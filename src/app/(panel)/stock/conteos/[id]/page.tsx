import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { dec } from "@/lib/money";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { cancelCountAction, removeCountLineAction } from "@/app/actions/stockCounts";
import { CountScanner } from "./CountScanner";
import { ConfirmCountForm } from "./ConfirmCountForm";

export const metadata = { title: "Conteo de stock · Udex" };

const STATUS_TONE = { counting: "warn", confirmed: "ok", cancelled: "neutral" } as const;
const STATUS_LABEL = { counting: "Contando", confirmed: "Cerrado — las diferencias ya se corrigieron", cancelled: "Cancelado" } as const;

export default async function CountPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.count");
  const { id } = await params;

  const count = await prisma.stockCount.findUnique({
    where: { id },
    include: { warehouse: true, lines: { orderBy: { createdAt: "asc" }, include: { variant: { include: { product: true } } } } },
  });
  if (!count || count.companyId !== ctx.companyId) notFound();
  const isOpen = count.status === "counting";

  const balances = await prisma.stockBalance.findMany({ where: { warehouseId: count.warehouseId, variantId: { in: count.lines.map((l) => l.variantId) } } });
  const onHandByVariant = new Map(balances.map((b) => [b.variantId, dec(b.onHand)]));
  const rows = count.lines.map((l) => {
    const theoretical = onHandByVariant.get(l.variantId) ?? dec(0);
    const counted = dec(l.countedQty);
    return { line: l, theoretical, counted, diff: counted.minus(theoretical) };
  });
  const diffCount = rows.filter((r) => !r.diff.isZero()).length;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/stock/conteos" className="text-sm underline">← Conteos</Link>
        <PageHeader title={`Conteo · ${count.warehouse.name}`} actions={<Badge tone={STATUS_TONE[count.status]}>{STATUS_LABEL[count.status]}</Badge>} />
      </div>

      {isOpen && (
        <Card className="p-5">
          <CountScanner countId={count.id} />
        </Card>
      )}

      <Card>
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 gap-y-1 px-5 py-3 text-xs font-medium text-muted uppercase">
          <span>Producto</span>
          <span className="text-right">Teórico</span>
          <span className="text-right">Contado</span>
          <span className="text-right">Diferencia</span>
        </div>
        <div className="flex flex-col divide-y divide-line">
          {rows.map(({ line, theoretical, counted, diff }) => (
            <div key={line.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-5 py-3">
              <div className="min-w-0">
                <p className="font-medium">{line.variant.product.name}</p>
                <p className="text-xs text-muted">{line.variant.sku}</p>
              </div>
              <span className="tabular text-right text-muted">{theoretical.toString()}</span>
              <span className="tabular text-right font-semibold">{counted.toString()}</span>
              <span className={`tabular text-right font-medium ${diff.isZero() ? "text-muted" : diff.isNegative() ? "text-danger" : "text-ok"}`}>
                {diff.isZero() ? "=" : diff.isNegative() ? diff.toString() : `+${diff.toString()}`}
              </span>
              {isOpen && (
                <form action={removeCountLineAction} className="col-span-4 -mt-1 text-right">
                  <input type="hidden" name="lineId" value={line.id} />
                  <button type="submit" className="text-sm text-muted underline hover:text-danger">Quitar</button>
                </form>
              )}
            </div>
          ))}
          {rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Todavía no escaneaste nada.</p>}
        </div>
      </Card>

      {isOpen && (
        <div className="flex items-center gap-4">
          <ConfirmCountForm countId={count.id} diffCount={diffCount} />
          <form action={cancelCountAction}>
            <input type="hidden" name="countId" value={count.id} />
            <button type="submit" className="text-sm text-muted underline">Cancelar</button>
          </form>
        </div>
      )}
    </div>
  );
}
