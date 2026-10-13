// Ledger de stock contra Postgres real: saldo correcto, bloqueo de negativo, y que el lock evite
// perder actualizaciones cuando varias transacciones tocan el mismo variantId+warehouseId a la vez.
//   DATABASE_URL=... node tests/e2e/run.cjs tests/e2e/stock-ledger.e2e.ts
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { postStockMovements, NegativeStockBlockedError, getStockOnHand } from "@/modules/inventory/post";

async function main() {
  // Base descartable (ver run.cjs): se puede vaciar sin miedo.
  for (const t of ["stockMovement", "stockBalance", "barcode", "variant", "product", "unit", "warehouse", "branch", "company"] as const) {
    await (prisma[t] as { deleteMany: () => Promise<unknown> }).deleteMany();
  }

  const company = await prisma.company.create({ data: { cuit: "30712345671", legalName: "Test SA", ivaCondition: "responsable_inscripto" } });
  const branch = await prisma.branch.create({ data: { companyId: company.id, name: "Central" } });
  const warehouse = await prisma.warehouse.create({ data: { companyId: company.id, branchId: branch.id, name: "Depósito" } });
  const unit = await prisma.unit.create({ data: { companyId: company.id, code: "un", name: "Unidad" } });
  const product = await prisma.product.create({ data: { companyId: company.id, name: "Remera", slug: "remera", baseUnitId: unit.id, status: "active" } });
  const variant = await prisma.variant.create({ data: { companyId: company.id, productId: product.id, sku: "REM-001", isDefault: true } });

  // ---- Un movimiento simple crea el saldo
  await prisma.$transaction((tx) =>
    postStockMovements(tx, { companyId: company.id, type: "initial", sourceType: "test", sourceId: "1", lines: [{ variantId: variant.id, warehouseId: warehouse.id, quantity: 10 }] }),
  );
  let on = await prisma.$transaction((tx) => getStockOnHand(tx, variant.id, warehouse.id));
  assert.equal(on.onHand.toString(), "10");

  // ---- Varios movimientos netean correctamente (entra, sale, entra)
  await prisma.$transaction((tx) =>
    postStockMovements(tx, { companyId: company.id, type: "adjustment", sourceType: "test", sourceId: "2", lines: [{ variantId: variant.id, warehouseId: warehouse.id, quantity: -3 }] }),
  );
  on = await prisma.$transaction((tx) => getStockOnHand(tx, variant.id, warehouse.id));
  assert.equal(on.onHand.toString(), "7", "10 - 3 = 7");

  // ---- Dos líneas del mismo movimiento sobre el mismo SKU se netean antes de chequear negativo
  await prisma.$transaction((tx) =>
    postStockMovements(
      tx,
      { companyId: company.id, type: "adjustment", sourceType: "test", sourceId: "3", lines: [
        { variantId: variant.id, warehouseId: warehouse.id, quantity: -10 },
        { variantId: variant.id, warehouseId: warehouse.id, quantity: 5 },
      ] },
      { allowNegative: false },
    ),
  );
  on = await prisma.$transaction((tx) => getStockOnHand(tx, variant.id, warehouse.id));
  assert.equal(on.onHand.toString(), "2", "7 - 10 + 5 = 2 (neto -5, no negativo)");

  // ---- Bloqueo de negativo: la política "block" rechaza y NO escribe nada (transacción completa)
  let blocked = false;
  try {
    await prisma.$transaction((tx) =>
      postStockMovements(tx, { companyId: company.id, type: "sale", sourceType: "test", sourceId: "4", lines: [{ variantId: variant.id, warehouseId: warehouse.id, quantity: -100 }] }, { allowNegative: false }),
    );
  } catch (e) {
    blocked = e instanceof NegativeStockBlockedError;
    if (blocked) {
      const err = e as InstanceType<typeof NegativeStockBlockedError>;
      assert.equal(err.shortages.length, 1);
      assert.equal(err.shortages[0].available.toString(), "2");
      assert.equal(err.shortages[0].requested.toString(), "100");
    }
  }
  assert.ok(blocked, "tiene que lanzar NegativeStockBlockedError");
  on = await prisma.$transaction((tx) => getStockOnHand(tx, variant.id, warehouse.id));
  assert.equal(on.onHand.toString(), "2", "el intento bloqueado no modificó nada");
  assert.equal(await prisma.stockMovement.count({ where: { sourceId: "4" } }), 0, "tampoco quedó el movimiento");

  // ---- allowNegative: true (política warn/allow) sí lo deja pasar
  await prisma.$transaction((tx) =>
    postStockMovements(tx, { companyId: company.id, type: "sale", sourceType: "test", sourceId: "5", lines: [{ variantId: variant.id, warehouseId: warehouse.id, quantity: -5 }] }, { allowNegative: true }),
  );
  on = await prisma.$transaction((tx) => getStockOnHand(tx, variant.id, warehouse.id));
  assert.equal(on.onHand.toString(), "-3");

  // ---- Concurrencia: 25 transacciones en paralelo, cada una suma 1. Sin el advisory lock se pierden
  // actualizaciones (leer 0, escribir 1, leer 0, escribir 1...); con el lock, el resultado tiene que ser
  // exacto. Arrancamos de 0 para que el número final sea inequívoco.
  await prisma.stockBalance.update({ where: { variantId_warehouseId: { variantId: variant.id, warehouseId: warehouse.id } }, data: { onHand: 0 } });
  const N = 25;
  await Promise.all(
    Array.from({ length: N }, (_, i) =>
      prisma.$transaction((tx) =>
        postStockMovements(tx, { companyId: company.id, type: "count", sourceType: "test", sourceId: `concurrent-${i}`, lines: [{ variantId: variant.id, warehouseId: warehouse.id, quantity: 1 }] }),
      ),
    ),
  );
  on = await prisma.$transaction((tx) => getStockOnHand(tx, variant.id, warehouse.id));
  assert.equal(on.onHand.toString(), String(N), `las ${N} transacciones concurrentes tienen que sumar exacto, sin perder ninguna`);
  assert.equal(await prisma.stockMovement.count({ where: { sourceType: "test", sourceId: { startsWith: "concurrent-" } } }), N);

  // ---- Movimientos a distintos variantId+warehouseId no se bloquean entre sí (locks por clave)
  const other = await prisma.variant.create({ data: { companyId: company.id, productId: product.id, sku: "REM-002", isDefault: false } });
  await Promise.all([
    prisma.$transaction((tx) => postStockMovements(tx, { companyId: company.id, type: "initial", sourceType: "test", sourceId: "6a", lines: [{ variantId: variant.id, warehouseId: warehouse.id, quantity: 1 }] })),
    prisma.$transaction((tx) => postStockMovements(tx, { companyId: company.id, type: "initial", sourceType: "test", sourceId: "6b", lines: [{ variantId: other.id, warehouseId: warehouse.id, quantity: 1 }] })),
  ]);
  const onOther = await prisma.$transaction((tx) => getStockOnHand(tx, other.id, warehouse.id));
  assert.equal(onOther.onHand.toString(), "1");

  console.log("OK: stock-ledger.e2e (saldo, negativo bloqueado, 25 escrituras concurrentes exactas)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
