-- AlterEnum: Add REFUNDED and PARTIALLY_REFUNDED to OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

-- Now we can safely remove WIREIN since no data uses it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'OrderSource' AND e.enumlabel = 'WIREIN'
    ) THEN
        -- Drop default temporarily
        ALTER TABLE "Order" ALTER COLUMN "orderSource" DROP DEFAULT;

        -- Create new enum and migrate
        CREATE TYPE "OrderSource_new" AS ENUM ('PHONE', 'WALKIN', 'EXTERNAL', 'WEBSITE', 'POS');
        ALTER TABLE "Order" ALTER COLUMN "orderSource" TYPE "OrderSource_new"
        USING (
          CASE
            WHEN "orderSource"::text = 'WIREIN' THEN 'EXTERNAL'
            ELSE "orderSource"::text
          END
        )::"OrderSource_new";
        DROP TYPE "OrderSource";
        ALTER TYPE "OrderSource_new" RENAME TO "OrderSource";

        -- Restore default
        ALTER TABLE "Order" ALTER COLUMN "orderSource" SET DEFAULT 'PHONE'::"OrderSource";
    END IF;
END $$;

-- AlterEnum: Expand OrderExternalSource
ALTER TYPE "OrderExternalSource" ADD VALUE IF NOT EXISTS 'DOORDASH';
ALTER TYPE "OrderExternalSource" ADD VALUE IF NOT EXISTS 'FUNERAL_SERVICE';
ALTER TYPE "OrderExternalSource" ADD VALUE IF NOT EXISTS 'OTHER';

-- Now we can safely remove FTD since no data uses it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'PaymentMethodType' AND e.enumlabel = 'FTD'
    ) THEN
        CREATE TYPE "PaymentMethodType_new" AS ENUM ('CASH', 'CARD', 'GIFT_CARD', 'STORE_CREDIT', 'CHECK', 'COD', 'HOUSE_ACCOUNT', 'OFFLINE', 'EXTERNAL');

        -- Update both tables that use this enum
        ALTER TABLE "payment_methods" ALTER COLUMN "type" TYPE "PaymentMethodType_new"
        USING (
          CASE
            WHEN "type"::text = 'FTD' THEN 'EXTERNAL'
            ELSE "type"::text
          END
        )::"PaymentMethodType_new";
        ALTER TABLE "refund_methods" ALTER COLUMN "paymentMethodType" TYPE "PaymentMethodType_new"
        USING (
          CASE
            WHEN "paymentMethodType"::text = 'FTD' THEN 'EXTERNAL'
            ELSE "paymentMethodType"::text
          END
        )::"PaymentMethodType_new";

        DROP TYPE "PaymentMethodType";
        ALTER TYPE "PaymentMethodType_new" RENAME TO "PaymentMethodType";
    END IF;
END $$;

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
