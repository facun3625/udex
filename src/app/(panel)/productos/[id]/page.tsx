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
import { AttributeAssignForm } from "./AttributeAssignForm";
import { GenerateVariantsForm } from "./GenerateVariantsForm";

export const metadata = { title: "Producto · Udex" };

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.view");
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      attributes: {
        orderBy: { sortOrder: "asc" },
        include: { attribute: { include: { options: { orderBy: { sortOrder: "asc" } } } } },
      },
      variants: {
        orderBy: { sku: "asc" },
        include: {
          options: { include: { option: true } },
          barcodes: { orderBy: { isPrimary: "desc" } },
          stockBalances: { include: { warehouse: true } },
        },
      },
    },
  });
  if (!product || product.companyId !== ctx.companyId) notFound();
  const canEdit = can(ctx, "catalog.edit");
  const canEditPrice = can(ctx, "prices.edit");
  const isVariable = product.attributes.length > 0;
  // Producto simple (sin ejes): la única variante se edita acá mismo, como siempre. Variable: cada
  // variante tiene su propia ficha (/variantes/[id]).
  const single = !isVariable ? product.variants[0] : undefined;
  const referencePrice = single ?? product.variants[0];

  const allAttributes = await prisma.attribute.findMany({ where: { companyId: ctx.companyId, type: { in: ["select", "color"] } }, orderBy: { name: "asc" } });
  const missing = missingFields({ price: referencePrice?.price.toString() ?? "0", categoryId: product.categoryId });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/productos" className="text-sm underline">← Productos</Link>
        <PageHeader
          title={product.name}
          description={single?.sku}
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
            categories={categoryOptions(await prisma.category.findMany({ where: { companyId: ctx.companyId }, select: { id: true, name: true, parentId: true } }))}
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

      {canEdit && (
        <Card className="p-5">
          <h2 className="mb-4 font-medium">Atributos y variantes</h2>
          <AttributeAssignForm
            productId={product.id}
            allAttributes={allAttributes.map((a) => ({ id: a.id, name: a.name }))}
            selectedIds={product.attributes.map((pa) => pa.attributeId)}
          />
          {isVariable && (
            <div className="mt-5 border-t border-line pt-5">
              <GenerateVariantsForm
                productId={product.id}
                axes={product.attributes.map((pa) => ({
                  attributeId: pa.attributeId,
                  name: pa.attribute.name,
                  options: pa.attribute.options.map((o) => ({
                    id: o.id,
                    value: o.value,
                    colorHex: o.colorHex,
                    used: product.variants.some((v) => v.options.some((vo) => vo.optionId === o.id)),
                  })),
                }))}
              />
            </div>
          )}
        </Card>
      )}

      {isVariable && (
        <Card>
          <div className="flex flex-col divide-y divide-line">
            {product.variants.map((v) => {
              const label = v.options.length > 0 ? v.options.map((o) => o.option.value).join(" · ") : v.sku;
              return (
                <Link key={v.id} href={`/productos/${product.id}/variantes/${v.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2/60">
                  <div className="min-w-0">
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted">{v.sku}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular text-sm">{formatMoney(v.price)}</span>
                    <Badge tone={v.enabled ? "ok" : "neutral"}>{v.enabled ? "Activa" : "Inactiva"}</Badge>
                  </div>
                </Link>
              );
            })}
            {product.variants.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Elegí las opciones arriba y generá las variantes.</p>}
          </div>
        </Card>
      )}

      {single && (
        <Card className="p-5">
          <h2 className="mb-4 font-medium">Precio</h2>
          {canEditPrice ? (
            <VariantPriceForm
              variantId={single.id}
              defaults={{ sku: single.sku, price: single.price.toString(), compareAtPrice: single.compareAtPrice?.toString() ?? "", costPrice: single.costPrice?.toString() ?? "" }}
            />
          ) : (
            <p className="text-lg font-semibold tabular">{formatMoney(single.price)}</p>
          )}
        </Card>
      )}

      {single && (
        <Card className="p-5">
          <h2 className="mb-4 font-medium">Códigos de barras</h2>
          {canEdit ? (
            <BarcodesPanel variantId={single.id} barcodes={single.barcodes.map((b) => ({ id: b.id, code: b.code, isPrimary: b.isPrimary }))} />
          ) : (
            <div className="flex flex-wrap gap-2">
              {single.barcodes.map((b) => <code key={b.id} className="rounded-md border border-line bg-surface-2 px-2.5 py-1 text-sm tabular">{b.code}</code>)}
            </div>
          )}
        </Card>
      )}

      {single && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Stock</h2>
            <Link href={`/productos/${product.id}/movimientos`} className="text-sm underline">Ver movimientos</Link>
          </div>
          <ul className="flex flex-col divide-y divide-line">
            {single.stockBalances.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                <span>{b.warehouse.name}</span>
                <span className="tabular font-medium">{formatQty(b.onHand, 0)}</span>
              </li>
            ))}
          </ul>
          {single.stockBalances.length === 0 && <p className="text-sm text-muted">Sin stock cargado todavía.</p>}
          <p className="mt-2 text-xs text-muted">El stock se carga desde Stock → Ingreso de mercadería o Ajustes; acá es solo lectura.</p>
        </Card>
      )}
    </div>
  );
}
