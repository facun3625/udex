"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireContext, requirePermission, requireWritable } from "@/modules/core/context";
import { prisma } from "@/lib/prisma";
import { resolveScan } from "@/modules/catalog/barcode";
import { createQuickProduct } from "@/modules/catalog/quickCreate";
import { postStockMovements } from "@/modules/inventory/post";
import { dec, roundQty } from "@/lib/money";

// Depósito donde recibe por defecto la sucursal activa. F1 no tiene todavía selector de depósito en
// esta pantalla (si una sucursal tiene varios, usa el que esté marcado por defecto) — ver F1.5b.
async function defaultWarehouseId(companyId: string, branchId: string): Promise<string> {
  const w = await prisma.warehouse.findFirst({ where: { companyId, branchId, isBranchDefault: true, active: true } });
  if (!w) throw new Error("La sucursal no tiene un depósito por defecto configurado");
  return w.id;
}

export async function createReceiptAction() {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.receive");
  requireWritable(ctx);

  const warehouseId = await defaultWarehouseId(ctx.companyId, ctx.branchId);
  const receipt = await prisma.stockReceipt.create({ data: { companyId: ctx.companyId, warehouseId, userId: ctx.user.id } });
  redirect(`/stock/ingresos/${receipt.id}`);
}

async function loadDraftReceipt(ctx: Awaited<ReturnType<typeof requireContext>>, receiptId: string) {
  const receipt = await prisma.stockReceipt.findUnique({ where: { id: receiptId } });
  if (!receipt || receipt.companyId !== ctx.companyId) throw new Error("Ingreso inválido");
  if (receipt.status !== "draft") throw new Error("Este ingreso ya no se puede editar");
  return receipt;
}

export type ScanIntoReceiptResult =
  | { ok: true; productName: string; sku: string; quantity: string }
  | { ok: false; code: string };

// Llamado directo desde el cliente (no es un <form action>, no useActionState): cada escaneo necesita
// una respuesta inmediata para el bip/feedback de ScanInput. Ver components/scan/ScanInput.tsx.
export async function scanIntoReceiptAction(receiptId: string, rawCode: string, multiplier: number): Promise<ScanIntoReceiptResult> {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.receive");
  requireWritable(ctx);
  const receipt = await loadDraftReceipt(ctx, receiptId);

  const result = await resolveScan(ctx.companyId, rawCode, multiplier);
  if (result.kind === "unknown") return { ok: false, code: result.code };

  const existing = await prisma.stockReceiptLine.findUnique({ where: { receiptId_variantId: { receiptId: receipt.id, variantId: result.variantId } } });
  if (existing) {
    await prisma.stockReceiptLine.update({ where: { id: existing.id }, data: { quantity: { increment: result.quantity.toString() }, scannedCode: rawCode } });
  } else {
    await prisma.stockReceiptLine.create({
      data: { receiptId: receipt.id, variantId: result.variantId, quantity: result.quantity.toString(), scannedCode: rawCode },
    });
  }

  revalidatePath(`/stock/ingresos/${receiptId}`);
  return { ok: true, productName: result.productName, sku: result.sku, quantity: result.quantity.toString() };
}

// Crear un producto "al vuelo" desde un código desconocido es parte del flujo de recepción (ver
// docs/08-codigos-de-barras.md §6 paso 5): alcanza con stock.receive, no se pide además catalog.edit —
// quien recibe mercadería tiene que poder resolverlo sin frenar la cola en el depósito. El producto
// queda mínimo (sin precio, sin categoría) y se termina de cargar después desde el catálogo (F2).
export async function quickCreateProductAction(receiptId: string, scannedCode: string, name: string, multiplier: number): Promise<ScanIntoReceiptResult> {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.receive");
  requireWritable(ctx);
  const receipt = await loadDraftReceipt(ctx, receiptId);
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, code: scannedCode };

  const { product, variant } = await prisma.$transaction((tx) => createQuickProduct(tx, { companyId: ctx.companyId, name: trimmed, scannedCode, userId: ctx.user.id }));
  const quantity = roundQty(dec(multiplier), 4);
  await prisma.stockReceiptLine.create({ data: { receiptId: receipt.id, variantId: variant.id, quantity: quantity.toString(), scannedCode } });

  revalidatePath(`/stock/ingresos/${receiptId}`);
  return { ok: true, productName: product.name, sku: variant.sku, quantity: quantity.toString() };
}

export async function removeReceiptLineAction(form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.receive");
  requireWritable(ctx);
  const lineId = String(form.get("lineId") ?? "");
  const line = await prisma.stockReceiptLine.findUnique({ where: { id: lineId }, include: { receipt: true } });
  if (!line || line.receipt.companyId !== ctx.companyId || line.receipt.status !== "draft") return;
  await prisma.stockReceiptLine.delete({ where: { id: lineId } });
  revalidatePath(`/stock/ingresos/${line.receiptId}`);
}

export type ConfirmReceiptState = { error?: string };

export async function confirmReceiptAction(_prev: ConfirmReceiptState, form: FormData): Promise<ConfirmReceiptState> {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.receive");
  requireWritable(ctx);
  const receiptId = String(form.get("receiptId") ?? "");
  const receipt = await loadDraftReceipt(ctx, receiptId).catch((e: Error) => e);
  if (receipt instanceof Error) return { error: receipt.message };

  const lines = await prisma.stockReceiptLine.findMany({ where: { receiptId } });
  if (lines.length === 0) return { error: "Escaneá al menos un producto antes de confirmar" };

  await prisma.$transaction(async (tx) => {
    await postStockMovements(tx, {
      companyId: ctx.companyId,
      type: "purchase_receipt",
      sourceType: "stock_receipt",
      sourceId: receiptId,
      userId: ctx.user.id,
      lines: lines.map((l) => ({ variantId: l.variantId, warehouseId: receipt.warehouseId, quantity: l.quantity, unitCost: l.unitCost ?? undefined, sourceLineId: l.id })),
    });
    await tx.stockReceipt.update({ where: { id: receiptId }, data: { status: "confirmed", confirmedAt: new Date() } });
  });

  revalidatePath(`/stock/ingresos/${receiptId}`);
  revalidatePath("/stock/ingresos");
  redirect(`/stock/ingresos/${receiptId}`);
}

export async function cancelReceiptAction(form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.receive");
  requireWritable(ctx);
  const receiptId = String(form.get("receiptId") ?? "");
  const receipt = await prisma.stockReceipt.findUnique({ where: { id: receiptId } });
  if (!receipt || receipt.companyId !== ctx.companyId || receipt.status !== "draft") return;
  await prisma.stockReceipt.update({ where: { id: receiptId }, data: { status: "cancelled" } });
  redirect("/stock/ingresos");
}
