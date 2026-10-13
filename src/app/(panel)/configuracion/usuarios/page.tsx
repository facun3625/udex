import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { branchLimit } from "@/modules/core/rules";
import { parseListParams, type SearchParams } from "@/lib/listParams";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { SearchBox } from "@/components/ui/ListFilters";
import { toggleUserActiveAction } from "@/app/actions/users";
import { NewUserForm } from "./NewUserForm";

export const metadata = { title: "Usuarios · Udex" };

type Row = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  isSuperadmin: boolean;
  accesses: { branchName: string | null; roleName: string }[];
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await requireContext();
  requirePermission(ctx, "users.manage");
  const sp = await searchParams;
  const lp = parseListParams(sp);

  const [memberships, roles, branches] = await Promise.all([
    prisma.membership.findMany({
      where: { companyId: ctx.companyId, user: lp.q ? { OR: [{ name: { contains: lp.q, mode: "insensitive" } }, { email: { contains: lp.q, mode: "insensitive" } }] } : undefined },
      include: { user: true, role: true, branch: true },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.role.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }] }),
    prisma.branch.findMany({ where: { companyId: ctx.companyId }, orderBy: { name: "asc" } }),
  ]);

  // Un usuario puede tener varias filas (varios accesos): se agrupan para el listado.
  const byUser = new Map<string, Row>();
  for (const m of memberships) {
    if (m.user.isSuperadmin) continue; // nunca aparece en la lista del cliente
    const row = byUser.get(m.userId) ?? { id: m.userId, name: m.user.name, email: m.user.email, active: m.user.active, isSuperadmin: false, accesses: [] };
    row.accesses.push({ branchName: m.branch?.name ?? null, roleName: m.role.name });
    byUser.set(m.userId, row);
  }
  const allRows = [...byUser.values()];
  const total = allRows.length;
  const rows = allRows.slice(lp.skip, lp.skip + lp.take);

  const columns: Column<Row>[] = [
    {
      key: "user",
      header: "Usuario",
      cell: (r) => (
        <Link href={`/configuracion/usuarios/${r.id}`} className="hover:underline">
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted">{r.email}</p>
        </Link>
      ),
    },
    {
      key: "access",
      header: "Acceso",
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.accesses.map((a, i) => <Badge key={i} tone="accent">{a.roleName}{a.branchName ? ` · ${a.branchName}` : " · todas"}</Badge>)}
        </div>
      ),
      className: "hidden sm:table-cell",
    },
    {
      key: "status",
      header: "Estado",
      cell: (r) => <Badge tone={r.active ? "ok" : "neutral"}>{r.active ? "Activo" : "Desactivado"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) =>
        r.id === ctx.user.id ? null : (
          <form action={toggleUserActiveAction}>
            <input type="hidden" name="userId" value={r.id} />
            <button type="submit" className="text-sm text-muted underline hover:text-text">{r.active ? "Desactivar" : "Reactivar"}</button>
          </form>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Usuarios" description="Quién puede entrar al panel y qué puede hacer." />
      <NewUserForm roles={roles.map((r) => ({ id: r.id, name: r.name }))} branches={branches} allowBranchChoice={branchLimit(ctx.license) !== 1} />
      <Card>
        <div className="border-b border-line p-3"><SearchBox placeholder="Buscar por nombre o email" /></div>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} empty={{ title: "Todavía no hay usuarios" }} />
        <Pagination pathname="/configuracion/usuarios" searchParams={sp} page={lp.page} perPage={lp.perPage} total={total} />
      </Card>
    </div>
  );
}
