import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { can, requireContext, requirePermission } from "@/modules/core/context";
import { categoryOptions } from "@/modules/catalog/categories";
import { missingFields } from "@/modules/catalog/completeness";
import { formatMoney, formatQty } from "@/lib/money";
import { Alert, Badge, Card, PageHeader } from "@/components/ui/Card";
import { ProductForm } from "./ProductForm";
import { VariantPriceForm } from "./VariantPriceForm";
import { BarcodesPanel } from "./BarcodesPanel";

export const metadata = { title: "Producto · Udex" };

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.view");
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: { where: { isDefault: true }, take: 1, include: { barcodes: { orderBy: { isPrimary: "desc" } }, stockBalances: { include: { warehouse: true } } } },
    },
  });
  if (!product || product.companyId !== ctx.companyId) notFound();
  const variant = product.variants[0];
  const canEdit = can(ctx, "catalog.edit");
  const canEditPrice = can(ctx, "prices.edit");

  const categories = await prisma.category.findMany({ where: { companyId: ctx.companyId }, select: { id: true, name: true, parentId: true } });
  const missing = missingFields({ price: variant?.price.toString() ?? "0", categoryId: product.categoryId });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/productos" className="text-sm underline">← Productos</Link>
        <PageHeader
          title={product.name}
          description={variant?.sku}
          actions={missing.length > 0 && <Badge tone="warn">Falta: {missing.join(", ")}</Badge>}
        />
      </div>

      {missing.length > 0 && (
        <Alert>Este producto todavía no está listo para vender: le falta {missing.join(" y ")}.</Alert>
      )}

      <Card className="p-5">
        <h2 className="mb-4 font-medium">Datos generales</h2>
        {canEdit ? (
          <ProductForm
            productId={product.id}
            categories={categoryOptions(categories)}
            defaults={{
              name: product.name,
              description: product.description ?? "",
              categoryId: product.categoryId,
              ivaRate: product.ivaRate.toString(),
              status: product.status,
            }}
          />
        ) : (
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Categoría</dt><dd>{product.category?.name ?? "—"}</dd></div>
            <div><dt className="text-muted">IVA</dt><dd>{product.ivaRate.toString()}%</dd></div>
          </dl>
        )}
      </Card>

      {variant && (
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
      )}

      {variant && (
        <Card className="p-5">
          <h2 className="mb-4 font-medium">Códigos de barras</h2>
          {canEdit ? (
            <BarcodesPanel
              variantId={variant.id}
              // Solo campos planos: un Decimal de Prisma (acá, "factor") no se puede pasar tal cual a
              // un componente cliente.
              barcodes={variant.barcodes.map((b) => ({ id: b.id, code: b.code, isPrimary: b.isPrimary }))}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {variant.barcodes.map((b) => <code key={b.id} className="rounded-md border border-line bg-surface-2 px-2.5 py-1 text-sm tabular">{b.code}</code>)}
            </div>
          )}
        </Card>
      )}

      {variant && variant.stockBalances.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 font-medium">Stock</h2>
          <ul className="flex flex-col divide-y divide-line">
            {variant.stockBalances.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                <span>{b.warehouse.name}</span>
                <span className="tabular font-medium">{formatQty(b.onHand, 0)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">El stock se carga desde Stock → Ingreso de mercadería; acá es solo lectura.</p>
        </Card>
      )}
    </div>
  );
}
