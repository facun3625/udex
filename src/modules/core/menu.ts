// Menú del panel. Cada ítem dice qué permiso y qué módulo necesita; el menú solo muestra lo que el
// usuario puede usar y lo que la instalación tiene contratado. Módulo puro (testeable).
import type { Permission } from "@/modules/core/permissions";
import type { ModuleKey } from "@/modules/core/modules";

// Nombres de íconos de lucide-react que entiende components/panel/icons.tsx.
export type MenuIcon = "home" | "pos" | "sales" | "products" | "stock" | "purchasing" | "treasury" | "reports" | "settings" | "audit";

export type MenuSection = "Operación" | "Gestión" | "Análisis" | "Sistema";

export type MenuItem = {
  href: string;
  label: string;
  icon: MenuIcon;
  section: MenuSection;
  permission?: Permission;
  module?: ModuleKey;
  ready: boolean; // false = todavía no está construido (se muestra deshabilitado)
};

export const MENU: MenuItem[] = [
  { href: "/", label: "Inicio", icon: "home", section: "Operación", ready: true },
  { href: "/caja", label: "Caja", icon: "pos", section: "Operación", permission: "pos.use", module: "pos", ready: false },
  { href: "/ventas", label: "Ventas", icon: "sales", section: "Operación", permission: "sales.view", ready: false },
  { href: "/stock", label: "Stock", icon: "stock", section: "Operación", permission: "stock.view", ready: false },
  { href: "/productos", label: "Productos", icon: "products", section: "Gestión", permission: "catalog.view", ready: false },
  { href: "/compras", label: "Compras", icon: "purchasing", section: "Gestión", permission: "purchasing.manage", module: "purchasing", ready: false },
  { href: "/tesoreria", label: "Caja y cobranzas", icon: "treasury", section: "Gestión", permission: "treasury.manage", module: "treasury", ready: false },
  { href: "/reportes", label: "Reportes", icon: "reports", section: "Análisis", permission: "reports.view", ready: false },
  { href: "/configuracion", label: "Configuración", icon: "settings", section: "Sistema", permission: "settings.manage", ready: false },
  { href: "/auditoria", label: "Auditoría", icon: "audit", section: "Sistema", permission: "audit.view", ready: true },
];

export function visibleMenu(
  items: MenuItem[],
  can: (p: Permission) => boolean,
  hasModule: (m: ModuleKey) => boolean,
): MenuItem[] {
  return items.filter((i) => (!i.permission || can(i.permission)) && (!i.module || hasModule(i.module)));
}

// Ítem activo para la URL actual: el de href más largo que la contiene ("/" solo exacto).
export function activeHref(items: { href: string }[], pathname: string): string | null {
  let best: string | null = null;
  for (const { href } of items) {
    const match = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
    if (match && (!best || href.length > best.length)) best = href;
  }
  return best;
}
