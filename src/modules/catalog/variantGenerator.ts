// Generador de variantes por combinación de ejes (Talle × Color → una variante por combinación). Módulo
// puro: no toca la base, solo combina y arma el SKU sugerido. Ver docs/02-modelo-de-datos.md §2.2.
import { slugify } from "@/modules/catalog/slug";

export type AxisOption = { id: string; value: string };
export type Axis = { attributeId: string; options: AxisOption[] };

export type Combination = { optionIds: string[]; label: string; skuSuffix: string };

// Clave estable para comparar combinaciones sin importar el orden en que vengan los ids (se ordenan).
export function combinationKey(optionIds: string[]): string {
  return [...optionIds].sort().join(":");
}

function optionCode(value: string): string {
  return slugify(value).toUpperCase().replace(/-/g, "").slice(0, 6) || "X";
}

// Producto cartesiano de las opciones de cada eje, en el orden de los ejes (Talle antes que Color, etc.).
// Un eje sin ninguna opción elegida hace que no se genere ninguna combinación (no tiene sentido una
// variante con un eje "vacío").
export function generateCombinations(axes: Axis[]): Combination[] {
  if (axes.length === 0 || axes.some((a) => a.options.length === 0)) return [];
  let combos: AxisOption[][] = [[]];
  for (const axis of axes) {
    const next: AxisOption[][] = [];
    for (const partial of combos) for (const opt of axis.options) next.push([...partial, opt]);
    combos = next;
  }
  return combos.map((opts) => ({
    optionIds: opts.map((o) => o.id),
    label: opts.map((o) => o.value).join(" · "),
    skuSuffix: opts.map((o) => optionCode(o.value)).join("-"),
  }));
}

// De todas las combinaciones posibles, cuáles ya existen como variante (no hay que duplicarlas) y
// cuáles hay que crear. `existing` son los sets de optionIds de las variantes que ya tiene el producto.
export function splitNewCombinations(combos: Combination[], existing: string[][]): { toCreate: Combination[]; alreadyExist: number } {
  const existingKeys = new Set(existing.map(combinationKey));
  const toCreate = combos.filter((c) => !existingKeys.has(combinationKey(c.optionIds)));
  return { toCreate, alreadyExist: combos.length - toCreate.length };
}

export function buildVariantSku(baseSku: string, skuSuffix: string): string {
  return `${baseSku}-${skuSuffix}`;
}
