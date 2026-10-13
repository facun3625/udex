-- AddForeignKey
ALTER TABLE "StockReceiptLine" ADD CONSTRAINT "StockReceiptLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

