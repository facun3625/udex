"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext, requirePermission, requireWritable } from "@/modules/core/context";
import { prisma } from "@/lib/prisma";
import { resolveScan } from "@/modules/catalog/barcode";
import { postStockMovements, NegativeStockBlockedError } from "@/modules/inventory/post";
import { allowsNegativeStock } from "@/modules/inventory/policy";
import { ADJUSTMENT_REASONS, isAdjustmentReason } from "@/modules/inventory/adjustmentReasons";
import { dec } from "@/lib/money";

async function defaultWarehouseId(companyId: string, branchId: string): Promise<string> {
  const w = await prisma.warehouse.findFirst({ where: { companyId, branchId, isBranchDefault: true, active: true } });
  if (!w) throw new Error("La sucursal no tiene un depósito por defecto configurado");
  return w.id;
}

const createSchema = z.object({ reason: z.string().refine(isAdjustmentReason, "Elegí un motivo"), note: z.string().trim().optional() });

export async function createAdjustmentAction(_prev: { error?: string }, form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.adjust");
  requireWritable(ctx);

  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const warehouseId = await defaultWarehouseId(ctx.companyId, ctx.branchId);
  const adjustment = await prisma.stockAdjustment.create({
    data: { companyId: ctx.companyId, warehouseId, userId: ctx.user.id, reason: parsed.data.reason, note: parsed.data.note || null },
  });
  redirect(`/stock/ajustes/${adjustment.id}`);
}

async function loadDraftAdjustment(ctx: Awaited<ReturnType<typeof requireContext>>, id: string) {
  const adjustment = await prisma.stockAdjustment.findUnique({ where: { id } });
  if (!adjustment || adjustment.companyId !== ctx.companyId) throw new Error("Ajuste inválido");
  if (adjustment.status !== "draft") throw new Error("Este ajuste ya no se puede editar");
  return adjustment;
}

export type ScanIntoAdjustmentResult =
  | { ok: true; productName: string; sku: string; delta: string }
  | { ok: false; code: string };

// `direction`: 1 para sumar, -1 para restar — lo decide el toggle de la pantalla, no el escaneo en sí.
export async function scanIntoAdjustmentAction(adjustmentId: string, rawCode: string, multiplier: number, direction: 1 | -1): Promise<ScanIntoAdjustmentResult> {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.adjust");
  requireWritable(ctx);
  await loadDraftAdjustment(ctx, adjustmentId); // valida que exista, sea de la empresa y siga en borrador

  const result = await resolveScan(ctx.companyId, rawCode, multiplier);
  if (result.kind === "unknown") return { ok: false, code: result.code };

  const signedDelta = result.quantity.times(direction);
  const existing = await prisma.stockAdjustmentLine.findUnique({ where: { adjustmentId_variantId: { adjustmentId, variantId: result.variantId } } });
  const newDelta = existing ? dec(existing.delta).plus(signedDelta) : signedDelta;
  if (existing) {
    await prisma.stockAdjustmentLine.update({ where: { id: existing.id }, data: { delta: newDelta.toString(), scannedCode: rawCode } });
  } else {
    await prisma.stockAdjustmentLine.create({ data: { adjustmentId, variantId: result.variantId, delta: newDelta.toString(), scannedCode: rawCode } });
  }

  revalidatePath(`/stock/ajustes/${adjustmentId}`);
  return { ok: true, productName: result.productName, sku: result.sku, delta: newDelta.toString() };
}

export async function removeAdjustmentLineAction(form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.adjust");
  requireWritable(ctx);
  const lineId = String(form.get("lineId") ?? "");
  const line = await prisma.stockAdjustmentLine.findUnique({ where: { id: lineId }, include: { adjustment: true } });
  if (!line || line.adjustment.companyId !== ctx.companyId || line.adjustment.status !== "draft") return;
  await prisma.stockAdjustmentLine.delete({ where: { id: lineId } });
  revalidatePath(`/stock/ajustes/${line.adjustmentId}`);
}

export type ConfirmAdjustmentState = { error?: string };

export async function confirmAdjustmentAction(_prev: ConfirmAdjustmentState, form: FormData): Promise<ConfirmAdjustmentState> {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.adjust");
  requireWritable(ctx);
  const adjustmentId = String(form.get("adjustmentId") ?? "");
  const adjustment = await loadDraftAdjustment(ctx, adjustmentId).catch((e: Error) => e);
  if (adjustment instanceof Error) return { error: adjustment.message };

  const [lines, warehouse] = await Promise.all([
    prisma.stockAdjustmentLine.findMany({ where: { adjustmentId } }),
    prisma.warehouse.findUniqueOrThrow({ where: { id: adjustment.warehouseId } }),
  ]);
  if (lines.length === 0) return { error: "Escaneá al menos un producto antes de confirmar" };

  try {
    await prisma.$transaction(async (tx) => {
      await postStockMovements(
        tx,
        {
          companyId: ctx.companyId,
          type: "adjustment",
          sourceType: "stock_adjustment",
          sourceId: adjustmentId,
          userId: ctx.user.id,
          lines: lines.map((l) => ({
            variantId: l.variantId,
            warehouseId: adjustment.warehouseId,
            quantity: l.delta,
            sourceLineId: l.id,
            note: adjustment.note ? `${ADJUSTMENT_REASONS[adjustment.reason]}: ${adjustment.note}` : ADJUSTMENT_REASONS[adjustment.reason],
          })),
        },
        { allowNegative: allowsNegativeStock(warehouse.negativeStockPolicy) },
      );
      await tx.stockAdjustment.update({ where: { id: adjustmentId }, data: { status: "confirmed", confirmedAt: new Date() } });
    });
  } catch (e) {
    if (e instanceof NegativeStockBlockedError) {
      return { error: `No hay suficiente stock: ${e.shortages.map((s) => `faltan ${s.requested.toString()}`).join(", ")}` };
    }
    throw e;
  }

  revalidatePath(`/stock/ajustes/${adjustmentId}`);
  revalidatePath("/stock/ajustes");
  redirect(`/stock/ajustes/${adjustmentId}`);
}

export async function cancelAdjustmentAction(form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.adjust");
  requireWritable(ctx);
  const adjustmentId = String(form.get("adjustmentId") ?? "");
  const adjustment = await prisma.stockAdjustment.findUnique({ where: { id: adjustmentId } });
  if (!adjustment || adjustment.companyId !== ctx.companyId || adjustment.status !== "draft") return;
  await prisma.stockAdjustment.update({ where: { id: adjustmentId }, data: { status: "cancelled" } });
  redirect("/stock/ajustes");
}
