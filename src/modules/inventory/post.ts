// Registrar movimientos de stock. Es el único camino para cambiar `StockBalance`: nunca se actualiza a
// mano. Ver docs/02-modelo-de-datos.md §1.3-1.4.
//
// Por qué un lock: dos pedidos que tocan el mismo variantId+warehouseId al mismo tiempo (ej. dos ventas
// por caja del mismo producto, o una venta y un ajuste) no pueden leer-sumar-escribir el saldo sin
// pisarse. Se toma un advisory lock de Postgres por cada combinación variantId+warehouseId ANTES de leer
// el saldo, en orden estable (ordenado) para que dos transacciones que tocan los mismos productos nunca
// se esperen en espejo (deadlock). El lock se suelta solo al terminar la transacción.
import "server-only";
import type { Tx } from "@/lib/prisma";
import { dec, sum, type Decimal, type DecimalInput } from "@/lib/money";
import type { StockMovementType } from "@/generated/prisma/client";

export type StockLine = {
  variantId: string;
  warehouseId: string;
  quantity: DecimalInput; // con signo: + entra, - sale
  unitCost?: DecimalInput;
  note?: string;
};

export type PostStockInput = {
  companyId: string;
  type: StockMovementType;
  sourceType: string;
  sourceId: string;
  userId?: string;
  lines: (StockLine & { sourceLineId?: string })[];
};

export type NegativeStockError_Shortage = { variantId: string; warehouseId: string; available: Decimal; requested: Decimal };

// Se lanza cuando la política de stock negativo del depósito es "block" y alguna línea haría quedar el
// saldo por debajo de cero. Ver modules/inventory/policy.ts.
export class NegativeStockBlockedError extends Error {
  constructor(public shortages: NegativeStockError_Shortage[]) {
    super("Negative stock blocked");
    this.name = "NegativeStockBlockedError";
  }
}

function lockKeys(lines: { variantId: string; warehouseId: string }[]): string[] {
  return [...new Set(lines.map((l) => `${l.variantId}:${l.warehouseId}`))].sort();
}

async function lockBalances(tx: Tx, keys: string[]) {
  for (const key of keys) {
    // $executeRaw (no $queryRaw): pg_advisory_xact_lock devuelve "void" y el driver adapter no puede
    // deserializar esa columna en una consulta de filas. Se libera solo al cerrar la transacción.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('stock_balance'), hashtext(${key}))`;
  }
}

// Registra los movimientos y actualiza (o crea) el saldo de cada variante+depósito, dentro de una
// transacción con los locks ya tomados. `allowNegative`: false bloquea si alguna línea deja el saldo
// negativo (política "block"); true las deja pasar (política "allow"/"warn" — el aviso es cosa de la UI).
export async function postStockMovements(tx: Tx, input: PostStockInput, opts: { allowNegative: boolean } = { allowNegative: true }): Promise<void> {
  if (input.lines.length === 0) return;
  await lockBalances(tx, lockKeys(input.lines));

  // Varias líneas del mismo movimiento pueden tocar la misma combinación variante+depósito (p.ej. un
  // ajuste con dos correcciones del mismo SKU): se agrupan para chequear negativo contra el efecto neto.
  const netByKey = new Map<string, Decimal>();
  for (const line of input.lines) {
    const key = `${line.variantId}:${line.warehouseId}`;
    netByKey.set(key, sum([netByKey.get(key) ?? dec(0), line.quantity]));
  }

  const balances = await tx.stockBalance.findMany({
    where: { OR: [...netByKey.keys()].map((k) => { const [variantId, warehouseId] = k.split(":"); return { variantId, warehouseId }; }) },
  });
  const onHandByKey = new Map(balances.map((b) => [`${b.variantId}:${b.warehouseId}`, dec(b.onHand)]));

  if (!opts.allowNegative) {
    const shortages: NegativeStockError_Shortage[] = [];
    for (const [key, delta] of netByKey) {
      const current = onHandByKey.get(key) ?? dec(0);
      const next = current.plus(delta);
      if (next.isNegative()) {
        const [variantId, warehouseId] = key.split(":");
        shortages.push({ variantId, warehouseId, available: current, requested: delta.negated() });
      }
    }
    if (shortages.length > 0) throw new NegativeStockBlockedError(shortages);
  }

  await tx.stockMovement.createMany({
    data: input.lines.map((line) => ({
      companyId: input.companyId,
      variantId: line.variantId,
      warehouseId: line.warehouseId,
      quantity: dec(line.quantity).toString(),
      unitCost: line.unitCost !== undefined ? dec(line.unitCost).toString() : null,
      type: input.type,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceLineId: line.sourceLineId,
      note: line.note,
      userId: input.userId,
    })),
  });

  for (const [key, delta] of netByKey) {
    const [variantId, warehouseId] = key.split(":");
    await tx.stockBalance.upsert({
      where: { variantId_warehouseId: { variantId, warehouseId } },
      create: { companyId: input.companyId, variantId, warehouseId, onHand: delta.toString() },
      update: { onHand: { increment: delta.toString() } },
    });
  }
}

export type StockOnHand = { onHand: Decimal; reserved: Decimal; available: Decimal };

export async function getStockOnHand(tx: Tx, variantId: string, warehouseId: string): Promise<StockOnHand> {
  const row = await tx.stockBalance.findUnique({ where: { variantId_warehouseId: { variantId, warehouseId } } });
  const onHand = dec(row?.onHand ?? 0);
  const reserved = dec(row?.reserved ?? 0);
  return { onHand, reserved, available: onHand.minus(reserved) };
}
