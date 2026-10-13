// Resolución de un código escaneado contra el catálogo de la empresa. Ver docs/08-codigos-de-barras.md §3.
import "server-only";
import { prisma } from "@/lib/prisma";
import type { Decimal, DecimalInput } from "@/lib/money";
import { isValidGs1Barcode, normalizeBarcode, scanQuantity, upcaToEan13 } from "@/modules/catalog/barcodeFormat";

export type ScanMatch = {
  kind: "variant";
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: Decimal; // ya multiplicada por el factor del código y por el multiplicador pedido
  matchedBy: "barcode" | "sku";
};
export type ScanResult = ScanMatch | { kind: "unknown"; code: string };

// Candidatos de búsqueda para un código leído: el código tal cual, y si es UPC-A (12 dígitos) también
// su forma EAN-13 (con el 0 de relleno) — un mismo producto puede tener guardado cualquiera de los dos.
function candidates(code: string): string[] {
  const list = [code];
  const asEan13 = upcaToEan13(code);
  if (asEan13 !== code) list.push(asEan13);
  return list;
}

export async function resolveScan(companyId: string, raw: string, multiplier: DecimalInput = 1): Promise<ScanResult> {
  const code = normalizeBarcode(raw);
  if (!code) return { kind: "unknown", code: raw };

  const barcode = await prisma.barcode.findFirst({
    where: { companyId, code: { in: candidates(code) } },
    include: { variant: { include: { product: true } } },
  });
  if (barcode && barcode.variant.enabled) {
    return {
      kind: "variant",
      variantId: barcode.variantId,
      productId: barcode.variant.productId,
      productName: barcode.variant.product.name,
      sku: barcode.variant.sku,
      quantity: scanQuantity(barcode.factor, multiplier),
      matchedBy: "barcode",
    };
  }

  // Sin código guardado: puede ser el SKU tipeado a mano (no todo el mundo tiene pistola todavía).
  const variant = await prisma.variant.findFirst({ where: { companyId, sku: code, enabled: true }, include: { product: true } });
  if (variant) {
    return {
      kind: "variant",
      variantId: variant.id,
      productId: variant.productId,
      productName: variant.product.name,
      sku: variant.sku,
      quantity: scanQuantity(1, multiplier),
      matchedBy: "sku",
    };
  }

  return { kind: "unknown", code };
}

// Para la pantalla "Probar lector" (F1.1d): no busca nada, solo informa qué recibió el servidor para
// poder diagnosticar un lector mal configurado (sin el sufijo Enter, con el teclado en otro idioma...).
export function diagnoseScan(raw: string): { normalized: string; looksLikeValidBarcode: boolean; hadControlChars: boolean; hadUnexpectedChars: boolean } {
  const normalized = normalizeBarcode(raw);
  return {
    normalized,
    looksLikeValidBarcode: isValidGs1Barcode(normalized),
    hadControlChars: normalized.length !== raw.trim().length,
    hadUnexpectedChars: /[^0-9A-Za-z-]/.test(normalized),
  };
}
