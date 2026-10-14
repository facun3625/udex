import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { can, requireContext, requirePermission } from "@/modules/core/context";
import { formatMoney, formatQty } from "@/lib/money";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { toggleVariantEnabledAction } from "@/app/actions/products";
import { VariantPriceForm } from "../../VariantPriceForm";
import { BarcodesPanel } from "../../BarcodesPanel";

export const metadata = { title: "Variante · Udex" };

export default async function VariantDetailPage({ params }: { params: Promise<{ id: string; variantId: string }> }) {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.view");
  const { id, variantId } = await params;

  const variant = await prisma.variant.findUnique({
    where: { id: variantId },
    include: {
      product: true,
      options: { include: { option: { include: { attribute: true } } } },
      barcodes: { orderBy: { isPrimary: "desc" } },
      stockBalances: { include: { warehouse: true } },
    },
  });
  if (!variant || variant.companyId !== ctx.companyId || variant.productId !== id) notFound();
  const canEdit = can(ctx, "catalog.edit");
  const canEditPrice = can(ctx, "prices.edit");
  const label = variant.options.length > 0 ? variant.options.map((o) => `${o.option.attribute.name}: ${o.option.value}`).join(" · ") : "Variante única";

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/productos/${variant.productId}`} className="text-sm underline">← {variant.product.name}</Link>
        <PageHeader
          title={label}
          description={variant.sku}
          actions={<Badge tone={variant.enabled ? "ok" : "neutral"}>{variant.enabled ? "Activa" : "Desactivada"}</Badge>}
        />
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-medium">Precio</h2>
        {canEditPrice ? (
          <VariantPriceForm
            variantId={variant.id}
            defaults={{ sku: variant.sku, price: variant.price.toString(), compareAtPrice: variant.compareAtPrice?.toString() ?? "", costPrice: variant.costPrice?.toString() ?? "" }}
          />
        ) : (
          <p className="text-lg font-semibold tabular">{formatMoney(variant.price)}</p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-medium">Códigos de barras</h2>
        {canEdit ? (
          <BarcodesPanel variantId={variant.id} barcodes={variant.barcodes.map((b) => ({ id: b.id, code: b.code, isPrimary: b.isPrimary }))} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {variant.barcodes.map((b) => <code key={b.id} className="rounded-md border border-line bg-surface-2 px-2.5 py-1 text-sm tabular">{b.code}</code>)}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Stock</h2>
          <Link href={`/productos/${variant.productId}/movimientos?variant=${variant.id}`} className="text-sm underline">Ver movimientos</Link>
        </div>
        <ul className="flex flex-col divide-y divide-line">
          {variant.stockBalances.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-2 text-sm">
              <span>{b.warehouse.name}</span>
              <span className="tabular font-medium">{formatQty(b.onHand, 0)}</span>
            </li>
          ))}
        </ul>
        {variant.stockBalances.length === 0 && <p className="text-sm text-muted">Sin stock cargado todavía.</p>}
      </Card>

      {canEdit && (
        <form action={toggleVariantEnabledAction}>
          <input type="hidden" name="variantId" value={variant.id} />
          <button type="submit" className="text-sm text-muted underline hover:text-text">
            {variant.enabled ? "Desactivar esta variante" : "Reactivar esta variante"}
          </button>
        </form>
      )}
    </div>
  );
}
