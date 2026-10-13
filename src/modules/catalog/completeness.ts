// Qué le falta a un producto para estar listo para vender. Hoy el único chequeo real es el precio (sin
// precio no tiene sentido venderlo); category es deseable pero no bloqueante. Módulo puro.
export type ProductCompletenessInput = { price: string | number; categoryId: string | null };

export function isProductComplete(p: ProductCompletenessInput): boolean {
  return Number(p.price) > 0;
}

export function missingFields(p: ProductCompletenessInput): string[] {
  const missing: string[] = [];
  if (!(Number(p.price) > 0)) missing.push("precio");
  if (!p.categoryId) missing.push("categoría");
  return missing;
}
