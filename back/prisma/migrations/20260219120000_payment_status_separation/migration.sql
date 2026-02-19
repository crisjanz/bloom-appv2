-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIALLY_PAID', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- Backfill payment status from completed payment allocations.
WITH order_paid_totals AS (
  SELECT
    op."orderId" AS order_id,
    COALESCE(SUM(op."amount"), 0)::INTEGER AS paid_total
  FROM "order_payments" op
  INNER JOIN "payment_transactions" pt ON pt."id" = op."transactionId"
  WHERE pt."status" = 'COMPLETED'
  GROUP BY op."orderId"
)
UPDATE "Order" o
SET "paymentStatus" = CASE
  WHEN opt.paid_total >= COALESCE(o."paymentAmount", 0) AND COALESCE(o."paymentAmount", 0) > 0
    THEN 'PAID'::"PaymentStatus"
  WHEN opt.paid_total > 0
    THEN 'PARTIALLY_PAID'::"PaymentStatus"
  ELSE o."paymentStatus"
END
FROM order_paid_totals opt
WHERE o."id" = opt.order_id;

-- Legacy fulfillment statuses REFUNDED/PARTIALLY_REFUNDED become payment statuses.
UPDATE "Order"
SET "paymentStatus" = 'REFUNDED'
WHERE "status" = 'REFUNDED';

UPDATE "Order"
SET "paymentStatus" = 'PARTIALLY_REFUNDED'
WHERE "status" = 'PARTIALLY_REFUNDED';

-- Keep fulfillment history by moving legacy refund statuses to COMPLETED.
UPDATE "Order"
SET "status" = 'COMPLETED'
WHERE "status" IN ('REFUNDED', 'PARTIALLY_REFUNDED');

-- Replace OrderStatus enum without payment-specific values.
CREATE TYPE "OrderStatus_new" AS ENUM (
  'DRAFT',
  'PAID',
  'IN_DESIGN',
  'READY',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'REJECTED',
  'CANCELLED'
);

ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order"
ALTER COLUMN "status" TYPE "OrderStatus_new"
USING ("status"::text::"OrderStatus_new");

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Rename payment method enum value COD -> PAY_LATER.
ALTER TYPE "PaymentMethodType" RENAME VALUE 'COD' TO 'PAY_LATER';

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");
