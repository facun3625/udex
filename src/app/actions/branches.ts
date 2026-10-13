"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission, requireWritable } from "@/modules/core/context";
import { audit } from "@/modules/core/audit";
import { branchLimit, limitReached } from "@/modules/core/rules";

export type BranchFormState = { error?: string; saved?: boolean };

const schema = z.object({ name: z.string().trim().min(1, "Falta el nombre") });

export async function createBranchAction(_prev: BranchFormState, form: FormData): Promise<BranchFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "settings.manage");
  requireWritable(ctx);

  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const current = await prisma.branch.count({ where: { companyId: ctx.companyId } });
  const limit = branchLimit(ctx.license);
  if (limitReached(limit, current)) {
    return {
      error:
        limit === 1
          ? "Tu plan no incluye varias sucursales. Hablá con soporte para habilitar el módulo."
          : `Tu plan permite hasta ${limit} sucursales.`,
    };
  }

  if (await prisma.branch.findUnique({ where: { companyId_name: { companyId: ctx.companyId, name: parsed.data.name } } })) {
    return { error: "Ya hay una sucursal con ese nombre" };
  }

  await prisma.$transaction(async (tx) => {
    const branch = await tx.branch.create({ data: { companyId: ctx.companyId, name: parsed.data.name } });
    await tx.warehouse.create({
      data: { companyId: ctx.companyId, branchId: branch.id, name: `Depósito ${parsed.data.name}`, isBranchDefault: true },
    });
    await audit({ companyId: ctx.companyId, user: ctx.user }, { action: "branch.create", targetType: "branch", targetId: branch.id, summary: `Sucursal creada: ${branch.name}` }, tx);
    return branch;
  });

  revalidatePath("/configuracion/empresa");
  return { saved: true };
}

const warehouseSchema = z.object({
  branchId: z.string().min(1),
  name: z.string().trim().min(1, "Falta el nombre"),
  kind: z.enum(["physical", "logical"]),
});

export async function createWarehouseAction(_prev: BranchFormState, form: FormData): Promise<BranchFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "settings.manage");
  requireWritable(ctx);

  const parsed = warehouseSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const branch = await prisma.branch.findUnique({ where: { id: parsed.data.branchId } });
  if (!branch || branch.companyId !== ctx.companyId) return { error: "Sucursal inválida" };

  const existing = await prisma.warehouse.findUnique({ where: { companyId_name: { companyId: ctx.companyId, name: parsed.data.name } } });
  if (existing) return { error: "Ya hay un depósito con ese nombre" };

  const warehouse = await prisma.warehouse.create({
    data: { companyId: ctx.companyId, branchId: parsed.data.branchId, name: parsed.data.name, kind: parsed.data.kind },
  });
  await audit({ companyId: ctx.companyId, user: ctx.user }, { action: "warehouse.create", targetType: "warehouse", targetId: warehouse.id, summary: `Depósito creado: ${warehouse.name}` });

  revalidatePath("/configuracion/empresa");
  return { saved: true };
}
