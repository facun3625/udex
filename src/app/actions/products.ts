"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission, requireWritable } from "@/modules/core/context";
import { audit } from "@/modules/core/audit";
import { slugify } from "@/modules/catalog/slug";
import { parseDecimalInput, roundMoney } from "@/lib/money";
import { normalizeBarcode } from "@/modules/catalog/barcodeFormat";
import { ensureDefaultUnit } from "@/modules/catalog/units";
import { redirect } from "next/navigation";

export type ProductFormState = { error?: string; saved?: boolean };

async function loadProduct(companyId: string, id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.companyId !== companyId) throw new Error("Producto inválido");
  return product;
}

const productSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1, "Falta el nombre"),
  description: z.string().trim().optional(),
  categoryId: z.string().optional(),
  ivaRate: z.string().refine((v) => parseDecimalInput(v) !== null, "IVA inválido"),
  status: z.enum(["draft", "active", "archived"]),
});

export async function updateProductAction(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);

  const parsed = productSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const before = await loadProduct(ctx.companyId, parsed.data.productId).catch((e: Error) => e);
  if (before instanceof Error) return { error: before.message };

  const categoryId = parsed.data.categoryId || null;
  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat || cat.companyId !== ctx.companyId) return { error: "Categoría inválida" };
  }
  const ivaRate = parseDecimalInput(parsed.data.ivaRate)!.toString();

  const data = {
    name: parsed.data.name,
    description: parsed.data.description || null,
    categoryId,
    ivaRate,
    status: parsed.data.status,
  };
  await prisma.product.update({ where: { id: before.id }, data });
  await audit(
    { companyId: ctx.companyId, user: ctx.user },
    { action: "product.update", targetType: "product", targetId: before.id, summary: `Producto editado: ${parsed.data.name}` },
  );

  revalidatePath(`/productos/${before.id}`);
  revalidatePath("/productos");
  return { saved: true };
}

const variantSchema = z.object({
  variantId: z.string().min(1),
  sku: z.string().trim().min(1, "Falta el SKU"),
  price: z.string().refine((v) => parseDecimalInput(v) !== null && !parseDecimalInput(v)!.isNegative(), "Precio inválido"),
  compareAtPrice: z.string().optional(),
  costPrice: z.string().optional(),
});

export async function updateVariantAction(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "prices.edit");
  requireWritable(ctx);

  const parsed = variantSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const variant = await prisma.variant.findUnique({ where: { id: parsed.data.variantId } });
  if (!variant || variant.companyId !== ctx.companyId) return { error: "Variante inválida" };

  const sku = parsed.data.sku.trim().toUpperCase();
  const existing = await prisma.variant.findUnique({ where: { companyId_sku: { companyId: ctx.companyId, sku } } });
  if (existing && existing.id !== variant.id) return { error: `Ya hay otro producto con el SKU "${sku}"` };

  const compareAtPrice = parsed.data.compareAtPrice?.trim() ? parseDecimalInput(parsed.data.compareAtPrice) : null;
  if (parsed.data.compareAtPrice?.trim() && compareAtPrice === null) return { error: "Precio de lista inválido" };
  const costPrice = parsed.data.costPrice?.trim() ? parseDecimalInput(parsed.data.costPrice) : null;
  if (parsed.data.costPrice?.trim() && costPrice === null) return { error: "Costo inválido" };

  await prisma.variant.update({
    where: { id: variant.id },
    data: {
      sku,
      price: roundMoney(parseDecimalInput(parsed.data.price)!).toString(),
      compareAtPrice: compareAtPrice ? roundMoney(compareAtPrice).toString() : null,
      costPrice: costPrice ? roundMoney(costPrice).toString() : null,
    },
  });
  await audit({ companyId: ctx.companyId, user: ctx.user }, { action: "variant.update_price", targetType: "variant", targetId: variant.id, summary: `Precio actualizado: ${sku}` });

  revalidatePath(`/productos/${variant.productId}`);
  revalidatePath("/productos");
  return { saved: true };
}

const categorySchema = z.object({ productId: z.string().min(1), name: z.string().trim().min(1, "Falta el nombre"), parentId: z.string().optional() });

export async function createCategoryAction(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);

  const parsed = categorySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const parentId = parsed.data.parentId || null;
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent || parent.companyId !== ctx.companyId) return { error: "Categoría padre inválida" };
  }

  const base = slugify(parsed.data.name) || "categoria";
  let slug = base;
  for (let n = 2; await prisma.category.findUnique({ where: { companyId_slug: { companyId: ctx.companyId, slug } } }); n++) slug = `${base}-${n}`;

  const category = await prisma.category.create({ data: { companyId: ctx.companyId, name: parsed.data.name, slug, parentId } });
  // Si se creó desde el producto (hay productId), lo asigna de una.
  const product = await loadProduct(ctx.companyId, parsed.data.productId).catch(() => null);
  if (product) await prisma.product.update({ where: { id: product.id }, data: { categoryId: category.id } });
  await audit({ companyId: ctx.companyId, user: ctx.user }, { action: "category.create", targetType: "category", targetId: category.id, summary: `Categoría creada: ${category.name}` });

  revalidatePath(product ? `/productos/${product.id}` : "/productos");
  return { saved: true };
}

const addBarcodeSchema = z.object({ variantId: z.string().min(1), code: z.string().trim().min(1, "Falta el código") });

export async function addBarcodeAction(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);

  const parsed = addBarcodeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const variant = await prisma.variant.findUnique({ where: { id: parsed.data.variantId } });
  if (!variant || variant.companyId !== ctx.companyId) return { error: "Variante inválida" };

  const code = normalizeBarcode(parsed.data.code);
  const existing = await prisma.barcode.findUnique({ where: { companyId_code: { companyId: ctx.companyId, code } } });
  if (existing) {
    if (existing.variantId === variant.id) return { error: "Ese código ya está cargado en este producto" };
    const owner = await prisma.variant.findUnique({ where: { id: existing.variantId }, include: { product: true } });
    return { error: `Ese código ya pertenece a "${owner?.product.name ?? "otro producto"}"` };
  }

  await prisma.barcode.create({ data: { companyId: ctx.companyId, code, variantId: variant.id, type: "internal" } });
  revalidatePath(`/productos/${variant.productId}`);
  return { saved: true };
}

export async function removeBarcodeAction(form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);

  const barcode = await prisma.barcode.findUnique({ where: { id: String(form.get("barcodeId") ?? "") }, include: { variant: true } });
  if (!barcode || barcode.companyId !== ctx.companyId) return;
  await prisma.barcode.delete({ where: { id: barcode.id } });
  revalidatePath(`/productos/${barcode.variant.productId}`);
}


const createSchema = z.object({
  name: z.string().trim().min(1, "Falta el nombre"),
  categoryId: z.string().optional(),
  ivaRate: z.string().refine((v) => parseDecimalInput(v) !== null, "IVA inválido"),
  price: z.string().refine((v) => v.trim() === "" || parseDecimalInput(v) !== null, "Precio inválido"),
});

// Alta manual (sin escanear un código) — la otra puerta de entrada al catálogo es
// modules/catalog/quickCreate.ts, desde el ingreso de mercadería.
export async function createProductAction(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);

  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const categoryId = parsed.data.categoryId || null;
  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat || cat.companyId !== ctx.companyId) return { error: "Categoría inválida" };
  }

  const product = await prisma.$transaction(async (tx) => {
    const unit = await ensureDefaultUnit(tx, ctx.companyId);
    const base = slugify(parsed.data.name) || "producto";
    let slug = base;
    for (let n = 2; await tx.product.findUnique({ where: { companyId_slug: { companyId: ctx.companyId, slug } } }); n++) slug = `${base}-${n}`;
    const skuBase = slugify(parsed.data.name).toUpperCase().replace(/-/g, "").slice(0, 10) || "PROD";
    let sku = skuBase;
    for (let n = 2; await tx.variant.findUnique({ where: { companyId_sku: { companyId: ctx.companyId, sku } } }); n++) sku = `${skuBase}-${n}`;

    const product = await tx.product.create({
      data: {
        companyId: ctx.companyId,
        name: parsed.data.name,
        slug,
        status: "draft",
        categoryId,
        baseUnitId: unit.id,
        ivaRate: parseDecimalInput(parsed.data.ivaRate)!.toString(),
      },
    });
    await tx.variant.create({
      data: {
        companyId: ctx.companyId,
        productId: product.id,
        sku,
        isDefault: true,
        price: parsed.data.price.trim() ? roundMoney(parseDecimalInput(parsed.data.price)!).toString() : "0",
      },
    });
    return product;
  });
  await audit({ companyId: ctx.companyId, user: ctx.user }, { action: "product.create", targetType: "product", targetId: product.id, summary: `Producto creado: ${product.name}` });

  revalidatePath("/productos");
  redirect(`/productos/${product.id}`);
}
