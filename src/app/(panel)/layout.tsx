import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { can, getAccess, hasModule, requireContext } from "@/modules/core/context";
import { MENU, visibleMenu } from "@/modules/core/menu";
import { PanelShell } from "@/components/panel/PanelShell";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const [company, branch, access, store] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: ctx.companyId }, select: { legalName: true, tradeName: true } }),
    prisma.branch.findUniqueOrThrow({ where: { id: ctx.branchId }, select: { name: true } }),
    getAccess(ctx.user),
    cookies(),
  ]);

  const menu = visibleMenu(MENU, (p) => can(ctx, p), (m) => hasModule(ctx, m));

  return (
    <PanelShell
      menu={menu}
      companyName={company.tradeName ?? company.legalName}
      branchName={branch.name}
      canSwitch={access.size > 1}
      user={{ name: ctx.user.name, email: ctx.user.email, isSuperadmin: ctx.user.isSuperadmin }}
      theme={parseTheme(store.get(THEME_COOKIE)?.value)}
      banner={
        ctx.license.readOnly ? (
          <div className="bg-danger px-4 py-2 text-sm text-white dark:text-bg">
            La licencia está vencida: el sistema está en modo solo lectura. Comunicate con soporte.
          </div>
        ) : undefined
      }
    >
      {children}
    </PanelShell>
  );
}
