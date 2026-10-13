// Menú del panel. Cada ítem dice qué permiso y qué módulo necesita; el menú solo muestra lo que el
// usuario puede usar y lo que la instalación tiene contratado. Módulo puro (testeable).
import type { Permission } from "@/modules/core/permissions";
import type { ModuleKey } from "@/modules/core/modules";

export type MenuItem = {
  href: string;
  label: string;
  permission?: Permission;
  module?: ModuleKey;
  ready: boolean; // false = todavía no está construido (se muestra deshabilitado)
};

export const MENU: MenuItem[] = [
  { href: "/", label: "Inicio", ready: true },
  { href: "/caja", label: "Caja", permission: "pos.use", module: "pos", ready: false },
  { href: "/ventas", label: "Ventas", permission: "sales.view", ready: false },
  { href: "/productos", label: "Productos", permission: "catalog.view", ready: false },
  { href: "/stock", label: "Stock", permission: "stock.view", ready: false },
  { href: "/compras", label: "Compras", permission: "purchasing.manage", module: "purchasing", ready: false },
  { href: "/tesoreria", label: "Caja y cobranzas", permission: "treasury.manage", module: "treasury", ready: false },
  { href: "/reportes", label: "Reportes", permission: "reports.view", ready: false },
  { href: "/configuracion", label: "Configuración", permission: "settings.manage", ready: false },
];

export function visibleMenu(
  items: MenuItem[],
  can: (p: Permission) => boolean,
  hasModule: (m: ModuleKey) => boolean,
): MenuItem[] {
  return items.filter((i) => (!i.permission || can(i.permission)) && (!i.module || hasModule(i.module)));
}
