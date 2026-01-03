-- AlterEnum: Add REFUNDED and PARTIALLY_REFUNDED to OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

-- AlterEnum: Add EXTERNAL to OrderSource first
ALTER TYPE "OrderSource" ADD VALUE IF NOT EXISTS 'EXTERNAL';

-- Update existing WIREIN values to EXTERNAL (if any exist)
UPDATE "Order" SET "source" = 'EXTERNAL' WHERE "source" = 'WIREIN';

-- AlterEnum: Expand OrderExternalSource
ALTER TYPE "OrderExternalSource" ADD VALUE IF NOT EXISTS 'DOORDASH';
ALTER TYPE "OrderExternalSource" ADD VALUE IF NOT EXISTS 'FUNERAL_SERVICE';
ALTER TYPE "OrderExternalSource" ADD VALUE IF NOT EXISTS 'OTHER';

-- AlterEnum: Add EXTERNAL to PaymentMethodType first
ALTER TYPE "PaymentMethodType" ADD VALUE IF NOT EXISTS 'EXTERNAL';

-- Update existing FTD values to EXTERNAL in payment_transactions (if any exist)
UPDATE "payment_transactions" SET "method" = 'EXTERNAL' WHERE "method" = 'FTD';

-- CreateTable: ExternalProvider
CREATE TABLE "external_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_providers_name_key" ON "external_providers"("name");
CREATE UNIQUE INDEX "external_providers_code_key" ON "external_providers"("code");

-- CreateTable: OrderRefund junction table
CREATE TABLE "order_refunds" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "order_refunds_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "refunds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Add new fields to Refund
ALTER TABLE "refunds" ADD COLUMN "refundType" TEXT NOT NULL DEFAULT 'FULL';
ALTER TABLE "refunds" ADD COLUMN "itemBreakdown" JSONB;
ALTER TABLE "refunds" ADD COLUMN "taxRefunded" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "refunds" ADD COLUMN "deliveryFeeRefunded" INTEGER NOT NULL DEFAULT 0;
