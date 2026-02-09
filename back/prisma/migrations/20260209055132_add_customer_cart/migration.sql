-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "cartData" JSONB,
ADD COLUMN     "cartUpdatedAt" TIMESTAMP(3);
