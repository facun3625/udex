import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccess, getScope, getSessionUser } from "@/modules/core/context";
import { formatCuit } from "@/modules/core/cuit";
import { logoutAction, selectBranchAction } from "@/app/actions/session";

export const metadata = { title: "Elegir sucursal · Udex" };

// Elegir en qué empresa y sucursal trabajar. Se llega acá al entrar (si hay más de una opción) o desde
// "Cambiar" en el encabezado del panel.
export default async function SelectBranchPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [scope, access, companies, branches] = await Promise.all([
    getScope(user),
    getAccess(user),
    prisma.company.findMany({ orderBy: { legalName: "asc" } }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
  ]);
  const currentBranchId = scope.status === "ok" ? scope.branchId : null;
  const groups = companies
    .map((c) => ({ company: c, branches: branches.filter((b) => b.companyId === c.id && access.has(b.id)) }))
    .filter((g) => g.branches.length > 0);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">¿Dónde vas a trabajar?</h1>
        <p className="text-sm text-muted">{user.name} · {user.email}</p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border bg-warn-soft p-5 text-sm text-warn">
          {user.isSuperadmin
            ? "Todavía no hay ninguna empresa cargada en esta instalación."
            : "Tu usuario todavía no tiene acceso a ninguna sucursal. Pedile al administrador que te lo dé."}
        </div>
      ) : (
        groups.map(({ company, branches }) => (
          <section key={company.id} className="rounded-xl border border-line bg-surface p-5">
            <h2 className="font-semibold">{company.tradeName ?? company.legalName}</h2>
            <p className="mb-3 text-xs text-muted">{company.legalName} · CUIT {formatCuit(company.cuit)}</p>
            <div className="flex flex-col gap-2">
              {branches.map((b) => (
                <form key={b.id} action={selectBranchAction}>
                  <input type="hidden" name="branchId" value={b.id} />
                  <button
                    type="submit"
                    className={`w-full rounded-lg border px-4 py-3 text-left hover:border-accent ${b.id === currentBranchId ? "border-accent bg-accent-soft" : "border-line"}`}
                  >
                    {b.name}
                    {b.id === currentBranchId && <span className="ml-2 text-xs text-muted">(actual)</span>}
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
