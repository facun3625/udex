// Catálogo de permisos: la única lista válida. Los roles (tabla Role) guardan claves de acá; una clave
// que no esté en este catálogo se ignora. Módulo puro: lo usa el servidor y también la UI para ocultar
// botones (el servidor igual vuelve a chequear siempre).

export const PERMISSIONS = {
  "settings.manage": "Configurar la empresa, sucursales y depósitos",
  "users.manage": "Crear usuarios y asignar roles",
  "audit.view": "Ver la auditoría",

  "catalog.view": "Ver productos",
  "catalog.edit": "Crear y editar productos",
  "prices.edit": "Cambiar precios y listas de precios",

  "stock.view": "Ver existencias y movimientos",
  "stock.receive": "Ingresar mercadería",
  "stock.adjust": "Ajustar stock",
  "stock.transfer": "Transferir entre depósitos",
  "stock.count": "Hacer conteos de inventario",

  "sales.view": "Ver ventas",
  "sales.create": "Crear presupuestos, pedidos y remitos",
  "sales.void": "Anular ventas / emitir notas de crédito",
  "pos.use": "Vender por caja",
  "pos.discount": "Aplicar descuentos en caja",

  "fiscal.issue": "Emitir comprobantes fiscales",
  "fiscal.configure": "Configurar ARCA (certificados, puntos de venta)",

  "purchasing.manage": "Compras y proveedores",
  "treasury.manage": "Caja, cobranzas y cuentas corrientes",
  "reports.view": "Ver reportes",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export function isPermission(value: string): value is Permission {
  return Object.prototype.hasOwnProperty.call(PERMISSIONS, value);
}

// Filtra lo que viene de la base (roles viejos pueden tener claves que ya no existen).
export function toPermissionSet(keys: Iterable<string>): Set<Permission> {
  const set = new Set<Permission>();
  for (const k of keys) if (isPermission(k)) set.add(k);
  return set;
}

// Roles de sistema que se crean solos en cada instalación (ver modules/core/seed.ts). El cliente puede
// crear roles propios además de estos.
export const SYSTEM_ROLES: { key: string; name: string; description: string; permissions: Permission[] }[] = [
  {
    key: "owner",
    name: "Dueño",
    description: "Acceso completo a la empresa",
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "manager",
    name: "Administrador",
    description: "Todo menos la configuración de ARCA",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "fiscal.configure"),
  },
  {
    key: "seller",
    name: "Vendedor",
    description: "Presupuestos, pedidos y caja",
    permissions: ["catalog.view", "stock.view", "sales.view", "sales.create", "pos.use", "fiscal.issue"],
  },
  {
    key: "cashier",
    name: "Cajero",
    description: "Vender por caja y cobrar",
    permissions: ["catalog.view", "stock.view", "pos.use", "fiscal.issue", "treasury.manage"],
  },
  {
    key: "warehouse",
    name: "Depósito",
    description: "Ingresos, transferencias y conteos",
    permissions: ["catalog.view", "stock.view", "stock.receive", "stock.transfer", "stock.count"],
  },
  {
    key: "accountant",
    name: "Contador",
    description: "Solo lectura de ventas, compras y reportes",
    permissions: ["catalog.view", "stock.view", "sales.view", "reports.view", "audit.view"],
  },
];
