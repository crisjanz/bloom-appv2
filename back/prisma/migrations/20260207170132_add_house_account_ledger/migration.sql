-- CreateEnum
CREATE TYPE "HouseAccountEntryType" AS ENUM ('CHARGE', 'PAYMENT', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "houseAccountNotes" TEXT,
ADD COLUMN     "houseAccountTerms" TEXT DEFAULT 'NET_30',
ADD COLUMN     "isHouseAccount" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "HouseAccountLedger" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "HouseAccountEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "orderId" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "HouseAccountLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HouseAccountLedger_customerId_idx" ON "HouseAccountLedger"("customerId");

-- CreateIndex
CREATE INDEX "HouseAccountLedger_createdAt_idx" ON "HouseAccountLedger"("createdAt");

-- AddForeignKey
ALTER TABLE "HouseAccountLedger" ADD CONSTRAINT "HouseAccountLedger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseAccountLedger" ADD CONSTRAINT "HouseAccountLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseAccountLedger" ADD CONSTRAINT "HouseAccountLedger_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
