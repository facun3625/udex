// Verifica, SIN pasar por el navegador, que el upsert con increment de StockCountLine es atómico bajo
// concurrencia real (lo que hace scanIntoCountAction en cada escaneo).
//   DATABASE_URL=... node tests/e2e/run.cjs tests/e2e/stock-count-concurrency.e2e.ts
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";

async function main() {
  for (const t of ["stockCountLine", "stockCount", "stockMovement", "stockBalance", "variant", "product", "unit", "warehouse", "branch", "company"] as const) {
    await (prisma[t] as { deleteMany: () => Promise<unknown> }).deleteMany();
  }
  const company = await prisma.company.create({ data: { cuit: "30712345671", legalName: "Test SA", ivaCondition: "responsable_inscripto" } });
  const branch = await prisma.branch.create({ data: { companyId: company.id, name: "Central" } });
  const warehouse = await prisma.warehouse.create({ data: { companyId: company.id, branchId: branch.id, name: "Depósito" } });
  const unit = await prisma.unit.create({ data: { companyId: company.id, code: "un", name: "Unidad" } });
  const product = await prisma.product.create({ data: { companyId: company.id, name: "Remera", slug: "remera", baseUnitId: unit.id, status: "active" } });
  const variant = await prisma.variant.create({ data: { companyId: company.id, productId: product.id, sku: "REM-001", isDefault: true } });
  const count = await prisma.stockCount.create({ data: { companyId: company.id, warehouseId: warehouse.id, userId: "u1" } });

  // 40 "escaneos" concurrentes del mismo producto, exactamente lo que hace scanIntoCountAction por cada
  // uno (sin el resolveScan de por medio, que no toca esta tabla).
  const N = 40;
  await Promise.all(
    Array.from({ length: N }, () =>
      prisma.stockCountLine.upsert({
        where: { countId_variantId: { countId: count.id, variantId: variant.id } },
        create: { countId: count.id, variantId: variant.id, countedQty: 1 },
        update: { countedQty: { increment: 1 } },
      }),
    ),
  );

  const line = await prisma.stockCountLine.findUniqueOrThrow({ where: { countId_variantId: { countId: count.id, variantId: variant.id } } });
  assert.equal(line.countedQty.toString(), String(N), `${N} upserts concurrentes tienen que sumar exacto, sin perder ninguno (dio ${line.countedQty})`);
  assert.equal(await prisma.stockCountLine.count({ where: { countId: count.id } }), 1, "tiene que quedar UNA sola línea, no una por cada upsert");

  console.log(`OK: stock-count-concurrency.e2e (${N} upserts concurrentes = ${line.countedQty.toString()})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
