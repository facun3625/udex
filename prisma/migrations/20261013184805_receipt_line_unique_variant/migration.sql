-- CreateIndex
CREATE UNIQUE INDEX "StockReceiptLine_receiptId_variantId_key" ON "StockReceiptLine"("receiptId", "variantId");

