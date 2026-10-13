// Árbol de categorías: construir la jerarquía y armar las opciones indentadas para un <select>. Módulo
// puro (recibe la lista plana ya leída de la base).
export type CategoryRow = { id: string; name: string; parentId: string | null };
export type CategoryOption = { id: string; label: string; depth: number };

// Orden: cada categoría seguida de sus hijas (recursivo), alfabético dentro de cada nivel. Categorías
// cuyo padre no está en la lista (no debería pasar, pero una empresa ajena no cuela) se tratan como raíz.
export function categoryOptions(rows: CategoryRow[]): CategoryOption[] {
  const byParent = new Map<string | null, CategoryRow[]>();
  const ids = new Set(rows.map((r) => r.id));
  for (const r of rows) {
    const parent = r.parentId && ids.has(r.parentId) ? r.parentId : null;
    const list = byParent.get(parent) ?? [];
    list.push(r);
    byParent.set(parent, list);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.name.localeCompare(b.name, "es"));

  const out: CategoryOption[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const r of byParent.get(parent) ?? []) {
      out.push({ id: r.id, label: `${"— ".repeat(depth)}${r.name}`, depth });
      walk(r.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
