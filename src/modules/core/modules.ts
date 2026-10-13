// Módulos que se venden por separado (licencia de la instalación, ver docs/01-arquitectura.md §5b).
// Lo que no está acá (empresa, usuarios, catálogo, stock) es la base y viene siempre.
// Módulo puro.

export const MODULES = {
  pos: "Venta por caja (POS)",
  fiscal_arca: "Facturación electrónica ARCA",
  channels: "Integración con tienda online",
  multi_branch: "Varias sucursales y depósitos",
  purchasing: "Compras y proveedores",
  treasury: "Caja, cobranzas y cuentas corrientes",
  reports_advanced: "Reportes avanzados",
} as const;

export type ModuleKey = keyof typeof MODULES;

export const ALL_MODULES = Object.keys(MODULES) as ModuleKey[];

export function isModuleKey(value: string): value is ModuleKey {
  return Object.prototype.hasOwnProperty.call(MODULES, value);
}

export type LicenseRow = {
  clientName: string;
  plan: string;
  modules: string[];
  maxCompanies: number | null;
  maxBranches: number | null;
  maxUsers: number | null;
  expiresAt: Date | null;
};

export type LicenseState = {
  configured: boolean; // false = no hay fila: todo habilitado y el superadmin ve el aviso
  modules: Set<ModuleKey>;
  expired: boolean; // vencida → solo lectura
  readOnly: boolean;
  limits: { companies: number | null; branches: number | null; users: number | null };
  expiresAt: Date | null;
};

export function licenseState(row: LicenseRow | null, now: Date = new Date()): LicenseState {
  if (!row) {
    return {
      configured: false,
      modules: new Set(ALL_MODULES),
      expired: false,
      readOnly: false,
      limits: { companies: null, branches: null, users: null },
      expiresAt: null,
    };
  }
  const expired = row.expiresAt !== null && row.expiresAt.getTime() <= now.getTime();
  return {
    configured: true,
    modules: new Set(row.modules.filter(isModuleKey)),
    expired,
    readOnly: expired,
    limits: { companies: row.maxCompanies, branches: row.maxBranches, users: row.maxUsers },
    expiresAt: row.expiresAt,
  };
}

// Días que faltan para el vencimiento (para avisar con tiempo). null si no vence.
export function daysUntilExpiry(state: LicenseState, now: Date = new Date()): number | null {
  if (!state.expiresAt) return null;
  return Math.ceil((state.expiresAt.getTime() - now.getTime()) / 86_400_000);
}
