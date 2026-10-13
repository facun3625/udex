// CUIT / CUIL: 11 dígitos con dígito verificador módulo 11. Se guarda siempre sin guiones.
// Módulo puro (lo usan formularios y servidor).

const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function normalizeCuit(raw: string): string {
  return raw.replace(/[\s.-]/g, "");
}

// Dígito verificador para los primeros 10 dígitos.
export function cuitCheckDigit(first10: string): number {
  const digits = first10.split("").map(Number);
  const total = WEIGHTS.reduce((acc, w, i) => acc + w * digits[i], 0);
  const mod = 11 - (total % 11);
  return mod === 11 ? 0 : mod === 10 ? 9 : mod;
}

export function isValidCuit(raw: string): boolean {
  const cuit = normalizeCuit(raw);
  if (!/^\d{11}$/.test(cuit)) return false;
  return cuitCheckDigit(cuit.slice(0, 10)) === Number(cuit[10]);
}

// "30-71234567-8"
export function formatCuit(raw: string): string {
  const c = normalizeCuit(raw);
  return c.length === 11 ? `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}` : raw;
}
