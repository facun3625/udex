-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('standard', 'service', 'kit');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "BarcodeType" AS ENUM ('ean13', 'ean8', 'upca', 'code128', 'internal');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('initial', 'purchase_receipt', 'purchase_return', 'sale', 'sale_return', 'adjustment', 'count', 'transfer_out', 'transfer_in', 'kit_assembly', 'kit_disassembly');

-- CreateEnum
CREATE TYPE "StockReceiptStatus" AS ENUM ('draft', 'confirmed', 'cancelled');

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ProductType" NOT NULL DEFAULT 'standard',
    "status" "ProductStatus" NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "baseUnitId" TEXT NOT NULL,
    "ivaRate" DECIMAL(5,2) NOT NULL DEFAULT 21,
    "trackStock" BOOLEAN NOT NULL DEFAULT true,
    "trackLots" BOOLEAN NOT NULL DEFAULT false,
    "trackSerials" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Barcode" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "unitId" TEXT,
    "factor" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "type" "BarcodeType" NOT NULL DEFAULT 'ean13',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Barcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,4),
    "type" "StockMovementType" NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceLineId" TEXT,
    "idempotencyKey" TEXT,
    "note" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBalance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "onHand" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "incoming" DECIMAL(18,4) NOT NULL DEFAULT 0,

    CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReceipt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "StockReceiptStatus" NOT NULL DEFAULT 'draft',
    "supplierName" TEXT,
    "supplierDocRef" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "StockReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,4),
    "scannedCode" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unit_companyId_code_key" ON "Unit"("companyId", "code");

-- CreateIndex
CREATE INDEX "Product_companyId_status_idx" ON "Product"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Product_companyId_slug_key" ON "Product"("companyId", "slug");

-- CreateIndex
CREATE INDEX "Variant_productId_idx" ON "Variant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Variant_companyId_sku_key" ON "Variant"("companyId", "sku");

-- CreateIndex
CREATE INDEX "Barcode_variantId_idx" ON "Barcode"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Barcode_companyId_code_key" ON "Barcode"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_idempotencyKey_key" ON "StockMovement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StockMovement_companyId_variantId_warehouseId_createdAt_idx" ON "StockMovement"("companyId", "variantId", "warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_sourceType_sourceId_idx" ON "StockMovement"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "StockBalance_companyId_warehouseId_idx" ON "StockBalance"("companyId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "StockBalance_variantId_warehouseId_key" ON "StockBalance"("variantId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockReceipt_companyId_status_idx" ON "StockReceipt"("companyId", "status");

-- CreateIndex
CREATE INDEX "StockReceiptLine_receiptId_idx" ON "StockReceiptLine"("receiptId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Barcode" ADD CONSTRAINT "Barcode_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReceipt" ADD CONSTRAINT "StockReceipt_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReceiptLine" ADD CONSTRAINT "StockReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "StockReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
