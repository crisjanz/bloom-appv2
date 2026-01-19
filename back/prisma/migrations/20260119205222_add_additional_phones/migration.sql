-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "additionalPhones" TEXT[] DEFAULT ARRAY[]::TEXT[];
