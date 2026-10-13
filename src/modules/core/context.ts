// Contexto de cada pedido: quién es, en qué empresa y sucursal está, qué puede hacer y qué módulos tiene
// la instalación. Todo se lee de la base en cada pedido (con cache() de React para no repetir consultas
// dentro del mismo render), nunca del JWT: desactivar un usuario o sacarle un permiso corta al instante.
//
// Uso en páginas:   const ctx = await requireContext();          (redirige a /login o /seleccionar)
// Uso en acciones:  const ctx = await requireContext(); requirePermission(ctx, "stock.adjust");
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Permission } from "@/modules/core/permissions";
import { type LicenseState, type ModuleKey, licenseState } from "@/modules/core/modules";
import { resolveScope, type Scope } from "@/modules/core/scope";

export const SCOPE_COOKIE = "udex_branch";

export type SessionUser = { id: string; name: string; email: string; isSuperadmin: boolean };

export type Ctx = {
  user: SessionUser;
  companyId: string;
  branchId: string;
  permissions: Set<Permission>;
  license: LicenseState;
};

export class ForbiddenError extends Error {
  constructor(message = "No tenés permiso para hacer esto") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export const getLicense = cache(async (): Promise<LicenseState> => {
  const row = await prisma.installationLicense.findUnique({ where: { id: "installation" } });
  return licenseState(row);
});

// Usuario logueado y activo, o null.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, isSuperadmin: true, active: true },
  });
  if (!user || !user.active) return null;
  return { id: user.id, name: user.name, email: user.email, isSuperadmin: user.isSuperadmin };
});

export const getScope = cache(async (user: SessionUser): Promise<Scope> => {
  const [memberships, companies, branches, store] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: user.id },
      select: { companyId: true, branchId: true, role: { select: { permissions: true } } },
    }),
    prisma.company.findMany({ select: { id: true, active: true } }),
    prisma.branch.findMany({ select: { id: true, companyId: true, active: true } }),
    cookies(),
  ]);
  return resolveScope({
    isSuperadmin: user.isSuperadmin,
    memberships: memberships.map((m) => ({ companyId: m.companyId, branchId: m.branchId, permissions: m.role.permissions })),
    companies,
    branches,
    requested: { branchId: store.get(SCOPE_COOKIE)?.value ?? null },
  });
});

export const getContext = cache(async (): Promise<Ctx | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const scope = await getScope(user);
  if (scope.status !== "ok") return null;
  return {
    user,
    companyId: scope.companyId,
    branchId: scope.branchId,
    permissions: scope.permissions,
    license: await getLicense(),
  };
});

// Para páginas y server actions del panel. Sin sesión → /login; sin empresa/sucursal elegida → /seleccionar.
export async function requireContext(): Promise<Ctx> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getContext();
  if (!ctx) redirect("/seleccionar");
  return ctx;
}

export function can(ctx: Ctx, permission: Permission): boolean {
  return ctx.user.isSuperadmin || ctx.permissions.has(permission);
}

export function requirePermission(ctx: Ctx, permission: Permission): void {
  if (!can(ctx, permission)) throw new ForbiddenError();
}

export function hasModule(ctx: Ctx, module: ModuleKey): boolean {
  return ctx.license.modules.has(module);
}

export function requireModule(ctx: Ctx, module: ModuleKey): void {
  if (!hasModule(ctx, module)) throw new ForbiddenError("Este módulo no está incluido en tu plan");
}

// Toda acción que escribe datos la llama: con la licencia vencida el sistema queda en solo lectura.
export function requireWritable(ctx: Ctx): void {
  if (ctx.license.readOnly && !ctx.user.isSuperadmin) {
    throw new ForbiddenError("La licencia está vencida: el sistema está en modo solo lectura");
  }
}

export function requireSuperadmin(ctx: { user: SessionUser }): void {
  if (!ctx.user.isSuperadmin) throw new ForbiddenError();
}
