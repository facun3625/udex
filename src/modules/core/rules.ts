// Reglas de negocio del módulo core que no necesitan base (testeables). Las usan las acciones de
// empresa, sucursales, usuarios y roles.
import type { LicenseState } from "@/modules/core/modules";
import { isPermission, type Permission } from "@/modules/core/permissions";

// ---- Límites de la licencia -------------------------------------------------------------------------

// Sin el módulo multi_branch la empresa tiene una sola sucursal, diga lo que diga el límite.
export function branchLimit(license: LicenseState): number | null {
  if (!license.modules.has("multi_branch")) return 1;
  return license.limits.branches;
}

export function limitReached(limit: number | null, current: number): boolean {
  return limit !== null && current >= limit;
}

// ---- Accesos de un usuario (Membership) --------------------------------------------------------------

export type AccessInput = { branchId: string | null; roleId: string };

// Una fila por sucursal (o "todas"): si la misma sucursal viene repetida, gana la última.
export function normalizeAccesses(list: AccessInput[]): AccessInput[] {
  const byBranch = new Map<string, AccessInput>();
  for (const a of list) {
    if (!a.roleId) continue;
    byBranch.set(a.branchId ?? "*", { branchId: a.branchId, roleId: a.roleId });
  }
  return [...byBranch.values()];
}

// ¿Con estos accesos el usuario conserva un permiso en la sucursal dada? Sirve para que nadie se saque
// a sí mismo la administración de usuarios y quede la empresa sin nadie que pueda darla.
export function keepsPermission(
  accesses: AccessInput[],
  rolePermissions: Map<string, string[]>,
  branchId: string,
  permission: Permission,
): boolean {
  return accesses.some(
    (a) => (a.branchId === null || a.branchId === branchId) && (rolePermissions.get(a.roleId) ?? []).includes(permission),
  );
}

// ---- Roles ------------------------------------------------------------------------------------------

export function cleanPermissions(keys: string[]): Permission[] {
  return [...new Set(keys.filter(isPermission))];
}

// "Encargado de depósito" → "encargado-de-deposito". Prefijo "custom-" para no chocar con los de sistema.
export function roleKeyFromName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `custom-${slug || "rol"}`;
}

// ---- Contraseñas ------------------------------------------------------------------------------------

export const MIN_PASSWORD_LENGTH = 8;

// Sin caracteres que se confunden al dictarla o leerla (0/O, 1/l/I).
const PASSWORD_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePassword(randomBytes: (n: number) => Uint8Array, length = 12): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  return out;
}
