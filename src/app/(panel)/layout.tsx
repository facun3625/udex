import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { can, getScope, hasModule, requireContext } from "@/modules/core/context";
import { MENU, visibleMenu } from "@/modules/core/menu";
import { logoutAction } from "@/app/actions/session";

// Estructura provisoria del panel: el layout definitivo (sidebar, buscador global, modo oscuro) es F0.7.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const [company, branch, scope] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: ctx.companyId }, select: { legalName: true, tradeName: true } }),
    prisma.branch.findUniqueOrThrow({ where: { id: ctx.branchId }, select: { name: true } }),
    getScope(ctx.user),
  ]);
  const canSwitch = scope.status === "choose" || (await prisma.branch.count({ where: { active: true } })) > 1;
  const menu = visibleMenu(MENU, (p) => can(ctx, p), (m) => hasModule(ctx, m));

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-neutral-200 bg-white md:w-56 md:border-r md:border-b-0">
        <div className="px-4 py-4 text-lg font-semibold">Udex</div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:pb-0">
          {menu.map((item) =>
            item.ready ? (
              <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-neutral-100">
                {item.label}
              </Link>
            ) : (
              <span key={item.href} title="Próximamente" className="cursor-default rounded-md px-3 py-2 text-sm whitespace-nowrap text-neutral-400">
                {item.label}
              </span>
            ),
          )}
          {ctx.user.isSuperadmin && (
            <Link href="/superadmin/licencia" className="rounded-md px-3 py-2 text-sm whitespace-nowrap text-violet-700 hover:bg-violet-50">
              Licencia (soporte)
            </Link>
          )}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 text-sm">
          <div>
            <span className="font-medium">{company.tradeName ?? company.legalName}</span>
            <span className="text-neutral-500"> · {branch.name}</span>
            {canSwitch && <Link href="/seleccionar" className="ml-3 underline">Cambiar</Link>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-neutral-600">{ctx.user.name}</span>
            <form action={logoutAction}><button className="underline">Salir</button></form>
          </div>
        </header>
        {ctx.license.readOnly && (
          <div className="bg-red-600 px-4 py-2 text-sm text-white">
            La licencia está vencida: el sistema está en modo solo lectura. Comunicate con soporte.
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
