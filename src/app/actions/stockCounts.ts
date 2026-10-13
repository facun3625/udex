"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireContext, requirePermission, requireWritable } from "@/modules/core/context";
import { prisma } from "@/lib/prisma";
import { resolveScan } from "@/modules/catalog/barcode";
import { postStockMovements } from "@/modules/inventory/post";
import { dec } from "@/lib/money";

async function defaultWarehouseId(companyId: string, branchId: string): Promise<string> {
  const w = await prisma.warehouse.findFirst({ where: { companyId, branchId, isBranchDefault: true, active: true } });
  if (!w) throw new Error("La sucursal no tiene un depósito por defecto configurado");
  return w.id;
}

export async function createCountAction() {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.count");
  requireWritable(ctx);
  const warehouseId = await defaultWarehouseId(ctx.companyId, ctx.branchId);
  const count = await prisma.stockCount.create({ data: { companyId: ctx.companyId, warehouseId, userId: ctx.user.id } });
  redirect(`/stock/conteos/${count.id}`);
}

async function loadOpenCount(ctx: Awaited<ReturnType<typeof requireContext>>, id: string) {
  const count = await prisma.stockCount.findUnique({ where: { id } });
  if (!count || count.companyId !== ctx.companyId) throw new Error("Conteo inválido");
  if (count.status !== "counting") throw new Error("Este conteo ya está cerrado");
  return count;
}

export type ScanIntoCountResult = { ok: true; productName: string; sku: string; countedQty: string } | { ok: false; code: string };

// Pensado para que cuenten varias personas a la vez, cada una desde su celular: el incremento es un
// UPDATE atómico (Postgres resuelve "sumá X al contador" sin carrera, no hace falta advisory lock acá
// como en postStockMovements — no hay una lectura previa que se pueda pisar).
export async function scanIntoCountAction(countId: string, rawCode: string, multiplier: number): Promise<ScanIntoCountResult> {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.count");
  requireWritable(ctx);
  await loadOpenCount(ctx, countId);

  const result = await resolveScan(ctx.companyId, rawCode, multiplier);
  if (result.kind === "unknown") return { ok: false, code: result.code };

  const line = await prisma.stockCountLine.upsert({
    where: { countId_variantId: { countId, variantId: result.variantId } },
    create: { countId, variantId: result.variantId, countedQty: result.quantity.toString(), scannedCode: rawCode },
    update: { countedQty: { increment: result.quantity.toString() }, scannedCode: rawCode },
  });

  revalidatePath(`/stock/conteos/${countId}`);
  return { ok: true, productName: result.productName, sku: result.sku, countedQty: line.countedQty.toString() };
}

export async function removeCountLineAction(form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.count");
  requireWritable(ctx);
  const line = await prisma.stockCountLine.findUnique({ where: { id: String(form.get("lineId") ?? "") }, include: { count: true } });
  if (!line || line.count.companyId !== ctx.companyId || line.count.status !== "counting") return;
  await prisma.stockCountLine.delete({ where: { id: line.id } });
  revalidatePath(`/stock/conteos/${line.countId}`);
}

export type ConfirmCountState = { error?: string };

export async function confirmCountAction(_prev: ConfirmCountState, form: FormData): Promise<ConfirmCountState> {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.count");
  requireWritable(ctx);
  const countId = String(form.get("countId") ?? "");
  const count = await loadOpenCount(ctx, countId).catch((e: Error) => e);
  if (count instanceof Error) return { error: count.message };

  const lines = await prisma.stockCountLine.findMany({ where: { countId } });
  if (lines.length === 0) return { error: "Escaneá al menos un producto antes de cerrar el conteo" };

  const balances = await prisma.stockBalance.findMany({ where: { warehouseId: count.warehouseId, variantId: { in: lines.map((l) => l.variantId) } } });
  const onHandByVariant = new Map(balances.map((b) => [b.variantId, dec(b.onHand)]));

  // Diferencias contra el teórico. Lo que no se escaneó no se toca (ver docs/02-modelo-de-datos.md §1.9):
  // este conteo puede ser parcial, cerrarlo no asume que el resto del depósito está en cero.
  const diffLines = lines
    .map((l) => ({ variantId: l.variantId, sourceLineId: l.id, delta: dec(l.countedQty).minus(onHandByVariant.get(l.variantId) ?? dec(0)) }))
    .filter((l) => !l.delta.isZero());

  await prisma.$transaction(async (tx) => {
    if (diffLines.length > 0) {
      await postStockMovements(
        tx,
        {
          companyId: ctx.companyId,
          type: "count",
          sourceType: "stock_count",
          sourceId: countId,
          userId: ctx.user.id,
          lines: diffLines.map((l) => ({ variantId: l.variantId, warehouseId: count.warehouseId, quantity: l.delta.toString(), sourceLineId: l.sourceLineId })),
        },
        { allowNegative: true }, // un conteo corrige al valor real contado; nunca tiene sentido bloquearlo por "negativo"
      );
    }
    await tx.stockCount.update({ where: { id: countId }, data: { status: "confirmed", confirmedAt: new Date() } });
  });

  revalidatePath(`/stock/conteos/${countId}`);
  revalidatePath("/stock/conteos");
  redirect(`/stock/conteos/${countId}`);
}

export async function cancelCountAction(form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.count");
  requireWritable(ctx);
  const countId = String(form.get("countId") ?? "");
  const count = await prisma.stockCount.findUnique({ where: { id: countId } });
  if (!count || count.companyId !== ctx.companyId || count.status !== "counting") return;
  await prisma.stockCount.update({ where: { id: countId }, data: { status: "cancelled" } });
  redirect("/stock/conteos");
}
