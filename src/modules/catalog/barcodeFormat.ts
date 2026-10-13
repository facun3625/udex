// Formato de códigos de barras: normalización y dígito verificador GS1 (EAN-13, EAN-8, UPC-A).
// Módulo puro — sin acceso a la base. La resolución contra el catálogo (qué variante es) vive en
// barcode.ts. Ver docs/08-codigos-de-barras.md §2-3.
import { Decimal, dec, type DecimalInput } from "@/lib/money";

// Lo que de verdad llega de la pistola: a veces con espacios, o con un Enter/Tab final que el campo ya
// descartó pero puede colarse si el lector no está bien configurado.
export function normalizeBarcode(raw: string): string {
  return raw.replace(/[\x00-\x1F\x7F]/g, "").trim();
}

// Dígito verificador GS1: desde el dígito más a la derecha de `dataDigits` (el anterior al
// verificador), multiplicando 3,1,3,1... hacia la izquierda. La misma regla vale para EAN-13 (12
// dígitos de datos), EAN-8 (7) y UPC-A (11, al no llevar el 0 de relleno).
export function gs1CheckDigit(dataDigits: string): number {
  let sum = 0;
  let weight: 3 | 1 = 3;
  for (let i = dataDigits.length - 1; i >= 0; i--) {
    sum += Number(dataDigits[i]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10;
}

// ¿Es un EAN-13/EAN-8/UPC-A válido (todo dígitos, verificador correcto)? UPC-A son 12 dígitos, que es
// también la longitud de los datos de un EAN-13 — por eso se distingue por el largo total (12 vs 13).
export function isValidGs1Barcode(code: string): boolean {
  if (!/^\d{8}$|^\d{12}$|^\d{13}$/.test(code)) return false;
  const data = code.slice(0, -1);
  const check = Number(code[code.length - 1]);
  return gs1CheckDigit(data) === check;
}

// UPC-A (12 dígitos) y EAN-13 son el mismo espacio de códigos: un escáner que lee un UPC-A a veces lo
// entrega sin el 0 de relleno. Se normaliza siempre a 13 para buscarlo en la base.
export function upcaToEan13(code: string): string {
  return /^\d{12}$/.test(code) ? `0${code}` : code;
}

// Prefijo reservado para códigos generados por Udex (productos sin código de fábrica). Configurable
// por instalación en el futuro; "20" es el rango que GS1 deja libre para uso interno.
export const INTERNAL_BARCODE_PREFIX = "20";

// A partir de un número de secuencia (0..9_999_999_99), arma un EAN-13 interno con verificador válido.
// Determinístico: el mismo número siempre da el mismo código, así el correlativo lo lleva quien llama
// (ej. un Sequence de la empresa) sin que este módulo necesite la base.
export function generateInternalEan13(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 9_999_999_999) {
    throw new RangeError(`Secuencia fuera de rango: ${sequence}`);
  }
  const data = INTERNAL_BARCODE_PREFIX + String(sequence).padStart(10, "0");
  return data + gs1CheckDigit(data);
}

// Cantidad que suma un escaneo: el factor del código (1 salvo que sea el código de una caja/bulto) por
// el multiplicador que haya tipeado la persona antes de escanear (ScanInput, "6*" + escaneo = 6).
export function scanQuantity(factor: DecimalInput, multiplier: DecimalInput = 1): Decimal {
  return dec(factor).times(dec(multiplier));
}
