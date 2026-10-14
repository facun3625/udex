import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { MOVEMENT_TYPE_LABEL } from "@/modules/inventory/movementTypes";
import { Card, PageHeader } from "@/components/ui/Card";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { FilterSelect } from "@/components/ui/ListFilters";
import { parseListParams, type SearchParams } from "@/lib/listParams";

export const metadata = { title: "Movimientos de stock · Udex" };

const dateFmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

export default async function ProductMovementsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.view");
  const { id } = await params;
  const sp = await searchParams;
  const lp = parseListParams(sp, { perPage: 50 });

  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: { orderBy: { sku: "asc" }, include: { options: { include: { option: { include: { attribute: true } } } } } } },
  });
  if (!product || product.companyId !== ctx.companyId) notFound();

  // Producto con una sola variante: no hace falta elegir, se muestra directo. Con varias, el parámetro
  // ?variant= elige cuál (por defecto, la primera).
  const requested = lp.get("variant");
  const variant = (requested && product.variants.find((v) => v.id === requested)) || product.variants[0];
  const label = (v: (typeof product.variants)[number]) => (v.options.length > 0 ? v.options.map((o) => o.option.value).join(" · ") : v.sku);

  const where = { companyId: ctx.companyId, variantId: variant?.id ?? "__none__" };
  const [rows, total] = variant
    ? await Promise.all([
        prisma.stockMovement.findMany({ where, include: { warehouse: true }, orderBy: { createdAt: "desc" }, skip: lp.skip, take: lp.take }),
        prisma.stockMovement.count({ where }),
      ])
    : [[], 0];

  const columns: Column<(typeof rows)[number]>[] = [
    { key: "date", header: "Fecha", cell: (m) => <span className="tabular whitespace-nowrap">{dateFmt.format(m.createdAt)}</span> },
    { key: "type", header: "Tipo", cell: (m) => MOVEMENT_TYPE_LABEL[m.type] },
    { key: "warehouse", header: "Depósito", cell: (m) => m.warehouse.name, className: "hidden sm:table-cell" },
    {
      key: "quantity",
      header: "Cantidad",
      align: "right",
      cell: (m) => {
        const positive = !m.quantity.isNegative();
        return <span className={`tabular font-medium ${positive ? "text-ok" : "text-danger"}`}>{positive ? "+" : ""}{m.quantity.toString()}</span>;
      },
    },
    { key: "note", header: "Nota", cell: (m) => m.note ?? "—", className: "hidden md:table-cell" },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href={`/productos/${product.id}`} className="text-sm underline">← {product.name}</Link>
        <PageHeader title="Movimientos de stock" description={variant ? `SKU ${variant.sku}` : undefined} />
      </div>
      <Card>
        {product.variants.length > 1 && (
          <div className="border-b border-line p-3">
            <FilterSelect param="variant" label="Variante" options={product.variants.map((v) => ({ value: v.id, label: label(v) }))} />
          </div>
        )}
        <DataTable columns={columns} rows={rows} rowKey={(m) => m.id} empty={{ title: "Sin movimientos todavía" }} />
        <Pagination pathname={`/productos/${product.id}/movimientos`} searchParams={sp} page={lp.page} perPage={lp.perPage} total={total} />
      </Card>
    </div>
  );
}
