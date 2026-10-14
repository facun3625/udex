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
import { generateCombinations, splitNewCombinations, buildVariantSku, type Axis } from "@/modules/catalog/variantGenerator";

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


const setAttributesSchema = z.object({ productId: z.string().min(1) });

// Reemplaza el conjunto de atributos (ejes) que usa el producto por el que vino marcado en el form
// (checkboxes "attributeId"). No borra variantes ya generadas con un atributo que se saca de la lista —
// quedan igual, solo deja de ofrecerse ese eje para generar combinaciones nuevas.
export async function setProductAttributesAction(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);

  const parsed = setAttributesSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Datos inválidos" };
  const product = await loadProduct(ctx.companyId, parsed.data.productId).catch((e: Error) => e);
  if (product instanceof Error) return { error: product.message };

  const attributeIds = form.getAll("attributeId").map(String);
  const attributes = await prisma.attribute.findMany({ where: { id: { in: attributeIds }, companyId: ctx.companyId } });
  if (attributes.length !== attributeIds.length) return { error: "Algún atributo elegido no es válido" };

  await prisma.$transaction([
    prisma.productAttribute.deleteMany({ where: { productId: product.id } }),
    prisma.productAttribute.createMany({ data: attributes.map((a, i) => ({ productId: product.id, attributeId: a.id, sortOrder: i })) }),
  ]);
  revalidatePath(`/productos/${product.id}`);
  return { saved: true };
}

export type GenerateVariantsState = { error?: string; created?: number; skipped?: number };

export async function generateVariantsAction(_prev: GenerateVariantsState, form: FormData): Promise<GenerateVariantsState> {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);

  const productId = String(form.get("productId") ?? "");
  const product = await loadProduct(ctx.companyId, productId).catch((e: Error) => e);
  if (product instanceof Error) return { error: product.message };

  const productAttributes = await prisma.productAttribute.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
    include: { attribute: { include: { options: true } } },
  });
  if (productAttributes.length === 0) return { error: "Este producto todavía no tiene atributos asignados" };

  // Por cada eje, las opciones que vinieron marcadas en el form (name="opt_<attributeId>").
  const axes: Axis[] = [];
  for (const pa of productAttributes) {
    const chosenIds = new Set(form.getAll(`opt_${pa.attributeId}`).map(String));
    const options = pa.attribute.options.filter((o) => chosenIds.has(o.id)).map((o) => ({ id: o.id, value: o.value }));
    if (options.length === 0) return { error: `Elegí al menos una opción de "${pa.attribute.name}"` };
    axes.push({ attributeId: pa.attributeId, options });
  }

  const combos = generateCombinations(axes);
  const existingVariants = await prisma.variant.findMany({ where: { productId }, include: { options: true } });
  const { toCreate } = splitNewCombinations(combos, existingVariants.map((v) => v.options.map((o) => o.optionId)));
  if (toCreate.length === 0) return { created: 0, skipped: combos.length };

  const baseSku = (product.slug || "PROD").toUpperCase().replace(/-/g, "").slice(0, 10);
  await prisma.$transaction(async (tx) => {
    for (const combo of toCreate) {
      let sku = buildVariantSku(baseSku, combo.skuSuffix);
      for (let n = 2; await tx.variant.findUnique({ where: { companyId_sku: { companyId: ctx.companyId, sku } } }); n++) {
        sku = `${buildVariantSku(baseSku, combo.skuSuffix)}-${n}`;
      }
      await tx.variant.create({
        data: {
          companyId: ctx.companyId,
          productId,
          sku,
          // El precio queda en 0 (default): se completa después desde la ficha de cada variante.
          options: { create: combo.optionIds.map((optionId) => ({ optionId })) },
        },
      });
    }
  });
  await audit({ companyId: ctx.companyId, user: ctx.user }, { action: "variant.generate", targetType: "product", targetId: productId, summary: `${toCreate.length} variante(s) generadas` });

  // La variante "huérfana" que trae todo producto al crearse (sin ningún eje) queda confusa mezclada
  // con las combinaciones reales una vez que el producto pasa a tener variantes de verdad: se desactiva
  // sola (nunca se borra, por si ya tiene stock o códigos de barra cargados).
  await prisma.variant.updateMany({
    where: { productId, enabled: true, options: { none: {} } },
    data: { enabled: false },
  });

  revalidatePath(`/productos/${productId}`);
  return { created: toCreate.length, skipped: combos.length - toCreate.length };
}

export async function toggleVariantEnabledAction(form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);
  const variant = await prisma.variant.findUnique({ where: { id: String(form.get("variantId") ?? "") } });
  if (!variant || variant.companyId !== ctx.companyId) return;
  await prisma.variant.update({ where: { id: variant.id }, data: { enabled: !variant.enabled } });
  revalidatePath(`/productos/${variant.productId}`);
}
