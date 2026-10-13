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
  permission?: Permission | Permission[]; // con lista: visible si tiene al menos uno (OR)
  module?: ModuleKey;
  ready: boolean; // false = todavía no está construido (se muestra deshabilitado)
};

export const MENU: MenuItem[] = [
  { href: "/", label: "Inicio", icon: "home", section: "Operación", ready: true },
  { href: "/caja", label: "Caja", icon: "pos", section: "Operación", permission: "pos.use", module: "pos", ready: false },
  { href: "/ventas", label: "Ventas", icon: "sales", section: "Operación", permission: "sales.view", ready: false },
  { href: "/stock", label: "Stock", icon: "stock", section: "Operación", permission: ["stock.view", "stock.receive"], ready: true },
  { href: "/productos", label: "Productos", icon: "products", section: "Gestión", permission: "catalog.view", ready: true },
  { href: "/compras", label: "Compras", icon: "purchasing", section: "Gestión", permission: "purchasing.manage", module: "purchasing", ready: false },
  { href: "/tesoreria", label: "Caja y cobranzas", icon: "treasury", section: "Gestión", permission: "treasury.manage", module: "treasury", ready: false },
  { href: "/reportes", label: "Reportes", icon: "reports", section: "Análisis", permission: "reports.view", ready: false },
  { href: "/configuracion", label: "Configuración", icon: "settings", section: "Sistema", permission: ["settings.manage", "users.manage"], ready: true },
  { href: "/auditoria", label: "Auditoría", icon: "audit", section: "Sistema", permission: "audit.view", ready: true },
];

export function visibleMenu(
  items: MenuItem[],
  can: (p: Permission) => boolean,
  hasModule: (m: ModuleKey) => boolean,
): MenuItem[] {
  const allowed = (i: MenuItem) => {
    if (!i.permission) return true;
    const list = Array.isArray(i.permission) ? i.permission : [i.permission];
    return list.some(can);
  };
  return items.filter((i) => allowed(i) && (!i.module || hasModule(i.module)));
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
