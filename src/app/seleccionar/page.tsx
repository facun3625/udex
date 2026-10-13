import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getScope, getSessionUser } from "@/modules/core/context";
import { accessibleBranches } from "@/modules/core/scope";
import { formatCuit } from "@/modules/core/cuit";
import { logoutAction, selectBranchAction } from "@/app/actions/session";

export const metadata = { title: "Elegir sucursal · Udex" };

// Elegir en qué empresa y sucursal trabajar. Se llega acá al entrar (si hay más de una opción) o desde
// "Cambiar" en el encabezado del panel.
export default async function SelectBranchPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const scope = await getScope(user);
  const [memberships, companies, branches] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: user.id },
      select: { companyId: true, branchId: true, role: { select: { permissions: true } } },
    }),
    prisma.company.findMany({ orderBy: { legalName: "asc" } }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
  ]);
  const access = accessibleBranches({
    isSuperadmin: user.isSuperadmin,
    memberships: memberships.map((m) => ({ companyId: m.companyId, branchId: m.branchId, permissions: m.role.permissions })),
    companies,
    branches,
  });
  const currentBranchId = scope.status === "ok" ? scope.branchId : null;
  const groups = companies
    .map((c) => ({ company: c, branches: branches.filter((b) => b.companyId === c.id && access.has(b.id)) }))
    .filter((g) => g.branches.length > 0);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">¿Dónde vas a trabajar?</h1>
        <p className="text-sm text-neutral-500">{user.name} · {user.email}</p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          {user.isSuperadmin
            ? "Todavía no hay ninguna empresa cargada en esta instalación."
            : "Tu usuario todavía no tiene acceso a ninguna sucursal. Pedile al administrador que te lo dé."}
        </div>
      ) : (
        groups.map(({ company, branches }) => (
          <section key={company.id} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">{company.tradeName ?? company.legalName}</h2>
            <p className="mb-3 text-xs text-neutral-500">{company.legalName} · CUIT {formatCuit(company.cuit)}</p>
            <div className="flex flex-col gap-2">
              {branches.map((b) => (
                <form key={b.id} action={selectBranchAction}>
                  <input type="hidden" name="branchId" value={b.id} />
                  <button
                    type="submit"
                    className={`w-full rounded-lg border px-4 py-3 text-left hover:border-neutral-900 ${b.id === currentBranchId ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"}`}
                  >
                    {b.name}
                    {b.id === currentBranchId && <span className="ml-2 text-xs text-neutral-500">(actual)</span>}
                  </button>
                </form>
              ))}
            </div>
          </section>
        ))
      )}

      <div className="flex gap-4 text-sm">
        {user.isSuperadmin && <a href="/superadmin/licencia" className="underline">Licencia</a>}
        <form action={logoutAction}><button className="underline">Salir</button></form>
      </div>
    </main>
  );
}
