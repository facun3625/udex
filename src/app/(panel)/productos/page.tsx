import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { parseListParams, type SearchParams } from "@/lib/listParams";
import { formatMoney } from "@/lib/money";
import { isProductComplete } from "@/modules/catalog/completeness";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { FilterSelect, SearchBox } from "@/components/ui/ListFilters";
import { LinkButton } from "@/components/ui/Button";

export const metadata = { title: "Productos · Udex" };

const STATUS_LABEL = { draft: "Borrador", active: "Activo", archived: "Archivado" } as const;
const STATUS_TONE = { draft: "neutral", active: "ok", archived: "neutral" } as const;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.view");
  const sp = await searchParams;
  const lp = parseListParams(sp);

  const where: Prisma.ProductWhereInput = {
    companyId: ctx.companyId,
    ...(lp.q && { name: { contains: lp.q, mode: "insensitive" } }),
    ...(lp.get("status") && { status: lp.get("status") as "draft" | "active" | "archived" }),
  };
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      // Sin filtrar por isDefault: un producto con variantes generadas (talle/color) no tiene ninguna
      // marcada isDefault — esa solo existe en los productos simples de una sola variante.
      include: { category: true, variants: { select: { sku: true, price: true } } },
      orderBy: { updatedAt: "desc" },
      skip: lp.skip,
      take: lp.take,
    }),
    prisma.product.count({ where }),
  ]);

  const priceRange = (prices: number[]) => {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
  };

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: "name",
      header: "Producto",
      cell: (p) => (
        <Link href={`/productos/${p.id}`} className="hover:underline">
          <p className="font-medium">{p.name}</p>
          <p className="text-xs text-muted">{p.variants.length === 1 ? p.variants[0].sku : `${p.variants.length} variante${p.variants.length === 1 ? "" : "s"}`}</p>
        </Link>
      ),
    },
    { key: "category", header: "Categoría", cell: (p) => p.category?.name ?? <span className="text-muted">Sin categoría</span>, className: "hidden md:table-cell" },
    {
      key: "price",
      header: "Precio",
      align: "right",
      cell: (p) => <span className="tabular">{p.variants.length === 0 ? formatMoney(0) : priceRange(p.variants.map((v) => Number(v.price)))}</span>,
    },
    {
      key: "status",
      header: "Estado",
      cell: (p) => {
        const hasPrice = p.variants.some((v) => Number(v.price) > 0);
        return (
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
            {!isProductComplete({ price: hasPrice ? "1" : "0", categoryId: p.categoryId }) && <Badge tone="warn">Falta completar</Badge>}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Productos"
        description="El catálogo de la empresa. Un producto nuevo se puede crear acá o escaneando un código desconocido al recibir mercadería."
        actions={<LinkButton href="/productos/nuevo">Nuevo producto</LinkButton>}
      />
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <SearchBox placeholder="Buscar por nombre" />
          <FilterSelect param="status" label="Estado" options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} empty={{ title: "Todavía no hay productos", description: 'Creá uno con "Nuevo producto" o escaneá un código al recibir mercadería.' }} />
        <Pagination pathname="/productos" searchParams={sp} page={lp.page} perPage={lp.perPage} total={total} />
      </Card>
    </div>
  );
}
