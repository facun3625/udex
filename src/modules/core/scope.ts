// Resolución de "dónde está parado" el usuario: empresa y sucursal activas, y qué permisos tiene ahí.
// Módulo puro (recibe los datos ya leídos de la base) para poder testearlo sin base.
import { ALL_PERMISSIONS, type Permission, toPermissionSet } from "@/modules/core/permissions";

export type MembershipInfo = {
  companyId: string;
  branchId: string | null; // null = todas las sucursales de la empresa
  permissions: string[];
};

export type BranchInfo = { id: string; companyId: string; active: boolean };
export type CompanyInfo = { id: string; active: boolean };

export type ScopeInput = {
  isSuperadmin: boolean;
  memberships: MembershipInfo[];
  companies: CompanyInfo[]; // las empresas de la instalación
  branches: BranchInfo[]; // las sucursales de la instalación
  requested: { companyId?: string | null; branchId?: string | null }; // lo que eligió (cookie)
};

export type Scope =
  | { status: "ok"; companyId: string; branchId: string; permissions: Set<Permission> }
  // Tiene acceso a más de una opción y todavía no eligió (o eligió algo a lo que ya no tiene acceso).
  | { status: "choose"; options: { companyId: string; branchId: string }[] }
  // No hay empresa/sucursal a la que pueda entrar (usuario sin accesos, o instalación vacía).
  | { status: "none" };

// Sucursales a las que puede entrar en cada empresa, con los permisos que tiene en cada una. Si tiene
// un acceso "todas las sucursales" y además uno puntual en una sucursal, en esa se suman los permisos.
export function accessibleBranches(input: Omit<ScopeInput, "requested">): Map<string, Set<Permission>> {
  const activeCompanies = new Set(input.companies.filter((c) => c.active).map((c) => c.id));
  const branches = input.branches.filter((b) => b.active && activeCompanies.has(b.companyId));
  const result = new Map<string, Set<Permission>>();

  if (input.isSuperadmin) {
    for (const b of branches) result.set(b.id, new Set(ALL_PERMISSIONS));
    return result;
  }

  for (const m of input.memberships) {
    const perms = toPermissionSet(m.permissions);
    const targets = branches.filter((b) => b.companyId === m.companyId && (m.branchId === null || m.branchId === b.id));
    for (const b of targets) {
      const current = result.get(b.id) ?? new Set<Permission>();
      for (const p of perms) current.add(p);
      result.set(b.id, current);
    }
  }
  return result;
}

export function resolveScope(input: ScopeInput): Scope {
  const access = accessibleBranches(input);
  if (access.size === 0) return { status: "none" };

  const branchCompany = new Map(input.branches.map((b) => [b.id, b.companyId]));
  const options = [...access.keys()].map((branchId) => ({ companyId: branchCompany.get(branchId)!, branchId }));

  const { companyId, branchId } = input.requested;
  if (branchId && access.has(branchId) && (!companyId || branchCompany.get(branchId) === companyId)) {
    return { status: "ok", companyId: branchCompany.get(branchId)!, branchId, permissions: access.get(branchId)! };
  }
  // Una sola opción posible: no tiene sentido preguntar.
  if (options.length === 1) {
    const only = options[0];
    return { status: "ok", ...only, permissions: access.get(only.branchId)! };
  }
  return { status: "choose", options };
}
