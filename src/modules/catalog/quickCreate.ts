// Alta rápida de producto desde el escaneo de un código desconocido (docs/08-codigos-de-barras.md §6
// paso 5). Crea Product + Variant (única, isDefault) + Barcode en una sola operación; el resto del
// producto (descripción, categoría, precio de venta...) se completa después desde el catálogo (F2).
import "server-only";
import type { Tx } from "@/lib/prisma";
import { ensureDefaultUnit } from "@/modules/catalog/units";
import { slugify } from "@/modules/catalog/slug";
import { isValidGs1Barcode } from "@/modules/catalog/barcodeFormat";

async function uniqueSlug(tx: Tx, companyId: string, name: string): Promise<string> {
  const base = slugify(name) || "producto";
  for (let n = 0; ; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    if (!(await tx.product.findUnique({ where: { companyId_slug: { companyId, slug: candidate } } }))) return candidate;
  }
}

async function uniqueSku(tx: Tx, companyId: string, name: string): Promise<string> {
  const base = slugify(name).toUpperCase().replace(/-/g, "").slice(0, 10) || "PROD";
  for (let n = 0; ; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    if (!(await tx.variant.findUnique({ where: { companyId_sku: { companyId, sku: candidate } } }))) return candidate;
  }
}

export async function createQuickProduct(tx: Tx, input: { companyId: string; name: string; scannedCode: string; userId?: string }) {
  const unit = await ensureDefaultUnit(tx, input.companyId);
  const [slug, sku] = await Promise.all([uniqueSlug(tx, input.companyId, input.name), uniqueSku(tx, input.companyId, input.name)]);

  const product = await tx.product.create({
    data: { companyId: input.companyId, name: input.name, slug, status: "active", baseUnitId: unit.id },
  });
  const variant = await tx.variant.create({ data: { companyId: input.companyId, productId: product.id, sku, isDefault: true } });
  await tx.barcode.create({
    data: {
      companyId: input.companyId,
      code: input.scannedCode,
      variantId: variant.id,
      isPrimary: true,
      type: isValidGs1Barcode(input.scannedCode) ? (input.scannedCode.length === 8 ? "ean8" : "ean13") : "internal",
    },
  });
  return { product, variant };
}
