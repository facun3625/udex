// Agrupación de permisos para mostrarlos en la pantalla de roles.
import { PERMISSIONS, type Permission } from "@/modules/core/permissions";

const GROUPS: { title: string; prefixes: string[] }[] = [
  { title: "Sistema", prefixes: ["settings.", "users.", "audit."] },
  { title: "Productos y precios", prefixes: ["catalog.", "prices."] },
  { title: "Stock", prefixes: ["stock."] },
  { title: "Ventas y caja", prefixes: ["sales.", "pos."] },
  { title: "Facturación", prefixes: ["fiscal."] },
  { title: "Compras, tesorería y reportes", prefixes: ["purchasing.", "treasury.", "reports."] },
];

export function permissionGroups(): { title: string; items: { key: Permission; label: string }[] }[] {
  const keys = Object.keys(PERMISSIONS) as Permission[];
  const used = new Set<Permission>();
  const groups = GROUPS.map((g) => {
    const items = keys.filter((k) => g.prefixes.some((p) => k.startsWith(p)));
    items.forEach((k) => used.add(k));
    return { title: g.title, items: items.map((key) => ({ key, label: PERMISSIONS[key] })) };
  });
  const rest = keys.filter((k) => !used.has(k));
  if (rest.length) groups.push({ title: "Otros", items: rest.map((key) => ({ key, label: PERMISSIONS[key] })) });
  return groups.filter((g) => g.items.length > 0);
}
