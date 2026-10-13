"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext, requirePermission, requireWritable } from "@/modules/core/context";
import { prisma } from "@/lib/prisma";
import { resolveScan } from "@/modules/catalog/barcode";
import { postStockMovements, NegativeStockBlockedError } from "@/modules/inventory/post";
import { allowsNegativeStock } from "@/modules/inventory/policy";
import { dec, parseDecimalInput, roundQty } from "@/lib/money";

async function defaultWarehouseId(companyId: string, branchId: string): Promise<string> {
  const w = await prisma.warehouse.findFirst({ where: { companyId, branchId, isBranchDefault: true, active: true } });
  if (!w) throw new Error("La sucursal no tiene un depósito por defecto configurado");
  return w.id;
}

const createSchema = z.object({ toWarehouseId: z.string().min(1, "Elegí el depósito de destino"), note: z.string().trim().optional() });

export async function createTransferAction(_prev: { error?: string }, form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.transfer");
  requireWritable(ctx);

  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const fromWarehouseId = await defaultWarehouseId(ctx.companyId, ctx.branchId);
  if (parsed.data.toWarehouseId === fromWarehouseId) return { error: "El destino tiene que ser un depósito distinto del de origen" };
  const to = await prisma.warehouse.findUnique({ where: { id: parsed.data.toWarehouseId } });
  if (!to || to.companyId !== ctx.companyId || !to.active) return { error: "Depósito de destino inválido" };

  const transfer = await prisma.stockTransfer.create({
    data: { companyId: ctx.companyId, fromWarehouseId, toWarehouseId: to.id, userId: ctx.user.id, note: parsed.data.note || null },
  });
  redirect(`/stock/transferencias/${transfer.id}`);
}

async function loadDraftTransfer(ctx: Awaited<ReturnType<typeof requireContext>>, id: string) {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id } });
  if (!transfer || transfer.companyId !== ctx.companyId) throw new Error("Transferencia inválida");
  if (transfer.status !== "draft") throw new Error("Esta transferencia ya salió del depósito de origen");
  return transfer;
}

export type ScanIntoTransferResult = { ok: true; productName: string; sku: string; quantity: string } | { ok: false; code: string };

export async function scanIntoTransferAction(transferId: string, rawCode: string, multiplier: number): Promise<ScanIntoTransferResult> {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.transfer");
  requireWritable(ctx);
  await loadDraftTransfer(ctx, transferId);

  const result = await resolveScan(ctx.companyId, rawCode, multiplier);
  if (result.kind === "unknown") return { ok: false, code: result.code };

  const existing = await prisma.stockTransferLine.findUnique({ where: { transferId_variantId: { transferId, variantId: result.variantId } } });
  if (existing) {
    await prisma.stockTransferLine.update({ where: { id: existing.id }, data: { quantity: { increment: result.quantity.toString() }, scannedCode: rawCode } });
  } else {
    await prisma.stockTransferLine.create({ data: { transferId, variantId: result.variantId, quantity: result.quantity.toString(), scannedCode: rawCode } });
  }
  revalidatePath(`/stock/transferencias/${transferId}`);
  return { ok: true, productName: result.productName, sku: result.sku, quantity: result.quantity.toString() };
}

export async function removeTransferLineAction(form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.transfer");
  requireWritable(ctx);
  const line = await prisma.stockTransferLine.findUnique({ where: { id: String(form.get("lineId") ?? "") }, include: { transfer: true } });
  if (!line || line.transfer.companyId !== ctx.companyId || line.transfer.status !== "draft") return;
  await prisma.stockTransferLine.delete({ where: { id: line.id } });
  revalidatePath(`/stock/transferencias/${line.transferId}`);
}

export type SendTransferState = { error?: string };

export async function sendTransferAction(_prev: SendTransferState, form: FormData): Promise<SendTransferState> {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.transfer");
  requireWritable(ctx);
  const transferId = String(form.get("transferId") ?? "");
  const transfer = await loadDraftTransfer(ctx, transferId).catch((e: Error) => e);
  if (transfer instanceof Error) return { error: transfer.message };

  const [lines, origin] = await Promise.all([
    prisma.stockTransferLine.findMany({ where: { transferId } }),
    prisma.warehouse.findUniqueOrThrow({ where: { id: transfer.fromWarehouseId } }),
  ]);
  if (lines.length === 0) return { error: "Escaneá al menos un producto antes de enviar" };

  try {
    await prisma.$transaction(async (tx) => {
      await postStockMovements(
        tx,
        {
          companyId: ctx.companyId,
          type: "transfer_out",
          sourceType: "stock_transfer",
          sourceId: transferId,
          userId: ctx.user.id,
          lines: lines.map((l) => ({ variantId: l.variantId, warehouseId: transfer.fromWarehouseId, quantity: dec(l.quantity).negated().toString(), sourceLineId: l.id })),
        },
        { allowNegative: allowsNegativeStock(origin.negativeStockPolicy) },
      );
      await tx.stockTransfer.update({ where: { id: transferId }, data: { status: "sent", sentAt: new Date() } });
    });
  } catch (e) {
    if (e instanceof NegativeStockBlockedError) {
      return { error: `No hay suficiente stock en el depósito de origen: ${e.shortages.map((s) => `faltan ${s.requested.toString()}`).join(", ")}` };
    }
    throw e;
  }

  revalidatePath(`/stock/transferencias/${transferId}`);
  revalidatePath("/stock/transferencias");
  redirect(`/stock/transferencias/${transferId}`);
}

export async function cancelTransferAction(form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.transfer");
  requireWritable(ctx);
  const transferId = String(form.get("transferId") ?? "");
  const transfer = await prisma.stockTransfer.findUnique({ where: { id: transferId } });
  if (!transfer || transfer.companyId !== ctx.companyId || transfer.status !== "draft") return;
  await prisma.stockTransfer.update({ where: { id: transferId }, data: { status: "cancelled" } });
  redirect("/stock/transferencias");
}

const receiveLineSchema = z.object({ lineId: z.string().min(1), receivedQuantity: z.string() });

export type ReceiveTransferState = { error?: string };

// Recibe la transferencia con lo que de verdad llegó por línea (form con un input por línea,
// nombre "qty_<lineId>"): puede diferir de lo que salió del origen (rotura en el camino, error de conteo).
export async function receiveTransferAction(_prev: ReceiveTransferState, form: FormData): Promise<ReceiveTransferState> {
  const ctx = await requireContext();
  requirePermission(ctx, "stock.transfer");
  requireWritable(ctx);
  const transferId = String(form.get("transferId") ?? "");

  const transfer = await prisma.stockTransfer.findUnique({ where: { id: transferId }, include: { lines: true } });
  if (!transfer || transfer.companyId !== ctx.companyId) return { error: "Transferencia inválida" };
  if (transfer.status !== "sent") return { error: "Esta transferencia no está esperando recepción" };

  const received: { lineId: string; variantId: string; quantity: ReturnType<typeof dec> }[] = [];
  for (const line of transfer.lines) {
    const raw = form.get(`qty_${line.id}`);
    const parsedLine = receiveLineSchema.safeParse({ lineId: line.id, receivedQuantity: String(raw ?? "") });
    if (!parsedLine.success) return { error: "Cantidad inválida" };
    const qty = parseDecimalInput(parsedLine.data.receivedQuantity);
    if (qty === null || qty.isNegative()) return { error: `Cantidad inválida para un producto de la transferencia` };
    received.push({ lineId: line.id, variantId: line.variantId, quantity: roundQty(qty, 4) });
  }

  await prisma.$transaction(async (tx) => {
    await postStockMovements(tx, {
      companyId: ctx.companyId,
      type: "transfer_in",
      sourceType: "stock_transfer",
      sourceId: transferId,
      userId: ctx.user.id,
      lines: received.filter((r) => !r.quantity.isZero()).map((r) => ({ variantId: r.variantId, warehouseId: transfer.toWarehouseId, quantity: r.quantity.toString(), sourceLineId: r.lineId })),
    });
    for (const r of received) await tx.stockTransferLine.update({ where: { id: r.lineId }, data: { receivedQuantity: r.quantity.toString() } });
    await tx.stockTransfer.update({ where: { id: transferId }, data: { status: "received", receivedAt: new Date(), receivedByUserId: ctx.user.id } });
  });

  revalidatePath(`/stock/transferencias/${transferId}`);
  revalidatePath("/stock/transferencias");
  redirect(`/stock/transferencias/${transferId}`);
}
