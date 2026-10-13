import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { can, requireContext } from "@/modules/core/context";
import { parseListParams, type SearchParams } from "@/lib/listParams";
import { Card, PageHeader } from "@/components/ui/Card";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { FilterSelect, SearchBox } from "@/components/ui/ListFilters";

export const metadata = { title: "Auditoría · Udex" };

const dateFmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

// Prefijos de acción para el filtro (la parte antes del punto: "license.update" → "license").
const AREAS: Record<string, string> = { license: "Licencia", user: "Usuarios", stock: "Stock", sale: "Ventas", fiscal: "Fiscal", settings: "Configuración" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await requireContext();
  if (!can(ctx, "audit.view")) notFound();
  const sp = await searchParams;
  const lp = parseListParams(sp);

  // Lo de la empresa activa y lo de la instalación (licencia: companyId null).
  const where: Prisma.AuditLogWhereInput = {
    OR: [{ companyId: ctx.companyId }, { companyId: null }],
    ...(lp.get("area") && { action: { startsWith: `${lp.get("area")}.` } }),
    ...(lp.q && {
      AND: [{ OR: [{ summary: { contains: lp.q, mode: "insensitive" } }, { userEmail: { contains: lp.q, mode: "insensitive" } }, { action: { contains: lp.q } }] }],
    }),
  };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: lp.skip, take: lp.take }),
    prisma.auditLog.count({ where }),
  ]);

  const columns: Column<(typeof rows)[number]>[] = [
    { key: "date", header: "Fecha", cell: (r) => <span className="tabular whitespace-nowrap">{dateFmt.format(r.createdAt)}</span> },
    { key: "user", header: "Usuario", cell: (r) => r.userEmail, className: "hidden md:table-cell" },
    {
      key: "what",
      header: "Qué pasó",
      cell: (r) => (
        <div>
          <p>{r.summary ?? r.action}</p>
          <p className="text-xs text-muted md:hidden">{r.userEmail}</p>
        </div>
      ),
    },
    { key: "action", header: "Código", cell: (r) => <code className="text-xs text-muted">{r.action}</code>, className: "hidden lg:table-cell" },
  ];

  return (
    <div>
      <PageHeader title="Auditoría" description="Quién hizo qué y cuándo: precios, ajustes de stock, anulaciones, usuarios y configuración." />
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <SearchBox placeholder="Buscar por texto o usuario" />
          <FilterSelect param="area" label="Área" options={Object.entries(AREAS).map(([value, label]) => ({ value, label }))} />
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} empty={{ title: "Sin registros", description: "Cuando alguien haga un cambio sensible, va a quedar registrado acá." }} />
        <Pagination pathname="/auditoria" searchParams={sp} page={lp.page} perPage={lp.perPage} total={total} />
      </Card>
    </div>
  );
}
