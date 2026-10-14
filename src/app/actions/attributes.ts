"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission, requireWritable } from "@/modules/core/context";
import { audit } from "@/modules/core/audit";
import { slugify } from "@/modules/catalog/slug";
import { isAttributeType } from "@/modules/catalog/attributeTypes";

export type AttributeFormState = { error?: string; saved?: boolean };

const createSchema = z.object({
  name: z.string().trim().min(1, "Falta el nombre"),
  type: z.string().refine(isAttributeType, "Elegí un tipo"),
  options: z.string().optional(), // una opción por línea; para "color" opcionalmente "Nombre #hex"
});

async function uniqueCode(companyId: string, name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || "atributo";
  let code = base;
  for (let n = 2; ; n++) {
    const existing = await prisma.attribute.findUnique({ where: { companyId_code: { companyId, code } } });
    if (!existing || existing.id === excludeId) return code;
    code = `${base}-${n}`;
  }
}

function parseOptionsText(raw: string | undefined): { value: string; colorHex: string | null }[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: { value: string; colorHex: string | null }[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^(.+?)\s+(#[0-9a-fA-F]{3,8})$/);
    const value = (m ? m[1] : trimmed).trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push({ value, colorHex: m ? m[2] : null });
  }
  return out;
}

export async function createAttributeAction(_prev: AttributeFormState, form: FormData): Promise<AttributeFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);

  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const options = parseOptionsText(parsed.data.options);
  if ((parsed.data.type === "select" || parsed.data.type === "color") && options.length === 0) {
    return { error: "Cargá al menos una opción (una por línea)" };
  }

  const code = await uniqueCode(ctx.companyId, parsed.data.name);
  const attribute = await prisma.attribute.create({
    data: {
      companyId: ctx.companyId,
      name: parsed.data.name,
      code,
      type: parsed.data.type,
      options: { create: options.map((o, i) => ({ value: o.value, colorHex: o.colorHex, sortOrder: i })) },
    },
  });
  await audit({ companyId: ctx.companyId, user: ctx.user }, { action: "attribute.create", targetType: "attribute", targetId: attribute.id, summary: `Atributo creado: ${attribute.name}` });

  revalidatePath("/configuracion/atributos");
  return { saved: true };
}

const updateAttributeSchema = z.object({
  attributeId: z.string().min(1),
  name: z.string().trim().min(1, "Falta el nombre"),
  type: z.string().refine(isAttributeType, "Elegí un tipo"),
});

export async function updateAttributeAction(_prev: AttributeFormState, form: FormData): Promise<AttributeFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);

  const parsed = updateAttributeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const attribute = await prisma.attribute.findUnique({ where: { id: parsed.data.attributeId } });
  if (!attribute || attribute.companyId !== ctx.companyId) return { error: "Atributo inválido" };

  const code = parsed.data.name === attribute.name ? attribute.code : await uniqueCode(ctx.companyId, parsed.data.name, attribute.id);
  await prisma.attribute.update({ where: { id: attribute.id }, data: { name: parsed.data.name, code, type: parsed.data.type } });
  await audit(
    { companyId: ctx.companyId, user: ctx.user },
    { action: "attribute.update", targetType: "attribute", targetId: attribute.id, summary: `Atributo editado: ${parsed.data.name}`, before: { name: attribute.name, type: attribute.type }, after: { name: parsed.data.name, type: parsed.data.type } },
  );

  revalidatePath("/configuracion/atributos");
  return { saved: true };
}

// Antes de borrar, se chequea a mano (en vez de dejar que la base lo rechace) para poder devolver un
// mensaje que explique por qué, en lugar de un error genérico.
export async function deleteAttributeAction(_prev: AttributeFormState, form: FormData): Promise<AttributeFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);

  const attributeId = String(form.get("attributeId") ?? "");
  const attribute = await prisma.attribute.findUnique({ where: { id: attributeId } });
  if (!attribute || attribute.companyId !== ctx.companyId) return { error: "Atributo inválido" };

  const [productCount, variantOptionCount] = await Promise.all([
    prisma.productAttribute.count({ where: { attributeId } }),
    prisma.variantOptionValue.count({ where: { option: { attributeId } } }),
  ]);
  if (productCount > 0) return { error: `Está asignado a ${productCount} producto${productCount === 1 ? "" : "s"}: sacalo de ahí antes de eliminarlo.` };
  if (variantOptionCount > 0) return { error: "Hay variantes ya generadas con una opción de este atributo: no se puede eliminar." };

  await prisma.attribute.delete({ where: { id: attributeId } }); // las opciones se borran en cascada
  await audit({ companyId: ctx.companyId, user: ctx.user }, { action: "attribute.delete", targetType: "attribute", targetId: attributeId, summary: `Atributo eliminado: ${attribute.name}` });

  revalidatePath("/configuracion/atributos");
  return { saved: true };
}

const addOptionSchema = z.object({ attributeId: z.string().min(1), value: z.string().trim().min(1, "Falta el valor"), colorHex: z.string().optional() });

export async function addAttributeOptionAction(_prev: AttributeFormState, form: FormData): Promise<AttributeFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);

  const parsed = addOptionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const attribute = await prisma.attribute.findUnique({ where: { id: parsed.data.attributeId }, include: { options: true } });
  if (!attribute || attribute.companyId !== ctx.companyId) return { error: "Atributo inválido" };
  if (attribute.options.some((o) => o.value.toLowerCase() === parsed.data.value.trim().toLowerCase())) {
    return { error: "Ya existe esa opción" };
  }

  await prisma.attributeOption.create({
    data: { attributeId: attribute.id, value: parsed.data.value.trim(), colorHex: parsed.data.colorHex || null, sortOrder: attribute.options.length },
  });
  revalidatePath("/configuracion/atributos");
  return { saved: true };
}

const updateOptionSchema = z.object({ optionId: z.string().min(1), value: z.string().trim().min(1, "Falta el valor"), colorHex: z.string().optional() });

export async function updateAttributeOptionAction(_prev: AttributeFormState, form: FormData): Promise<AttributeFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);

  const parsed = updateOptionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const option = await prisma.attributeOption.findUnique({ where: { id: parsed.data.optionId }, include: { attribute: { include: { options: true } } } });
  if (!option || option.attribute.companyId !== ctx.companyId) return { error: "Opción inválida" };
  const value = parsed.data.value.trim();
  if (option.attribute.options.some((o) => o.id !== option.id && o.value.toLowerCase() === value.toLowerCase())) {
    return { error: "Ya existe otra opción con ese valor" };
  }

  await prisma.attributeOption.update({ where: { id: option.id }, data: { value, colorHex: parsed.data.colorHex || null } });
  revalidatePath("/configuracion/atributos");
  return { saved: true };
}

export async function removeAttributeOptionAction(_prev: AttributeFormState, form: FormData): Promise<AttributeFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  requireWritable(ctx);

  const optionId = String(form.get("optionId") ?? "");
  const option = await prisma.attributeOption.findUnique({ where: { id: optionId }, include: { attribute: true } });
  if (!option || option.attribute.companyId !== ctx.companyId) return { error: "Opción inválida" };

  const variantOptionCount = await prisma.variantOptionValue.count({ where: { optionId } });
  if (variantOptionCount > 0) {
    return { error: `"${option.value}" ya se usa en ${variantOptionCount} variante${variantOptionCount === 1 ? "" : "s"}: no se puede eliminar.` };
  }

  await prisma.attributeOption.delete({ where: { id: optionId } });
  revalidatePath("/configuracion/atributos");
  return { saved: true };
}
