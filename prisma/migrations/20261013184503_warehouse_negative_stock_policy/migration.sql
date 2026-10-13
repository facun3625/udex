-- CreateEnum
CREATE TYPE "NegativeStockPolicy" AS ENUM ('block', 'warn', 'allow');

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "negativeStockPolicy" "NegativeStockPolicy" NOT NULL DEFAULT 'block';
