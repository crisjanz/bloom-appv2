-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "periodLimit" INTEGER,
ADD COLUMN     "periodType" "PeriodType",
ADD COLUMN     "periodWindowDays" INTEGER;

-- CreateIndex
CREATE INDEX "Discount_customerId_idx" ON "Discount"("customerId");

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
