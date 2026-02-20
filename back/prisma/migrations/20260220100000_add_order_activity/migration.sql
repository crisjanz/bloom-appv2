-- CreateEnum
CREATE TYPE "OrderActivityType" AS ENUM (
  'STATUS_CHANGE',
  'PAYMENT_STATUS_CHANGE',
  'PAYMENT_RECEIVED',
  'REFUND_PROCESSED',
  'PAYMENT_ADJUSTMENT',
  'ORDER_EDITED',
  'ORDER_CREATED'
);

-- CreateTable
CREATE TABLE "OrderActivity" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "OrderActivityType" NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "actorId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderActivity_orderId_createdAt_idx" ON "OrderActivity"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderActivity_type_idx" ON "OrderActivity"("type");

-- AddForeignKey
ALTER TABLE "OrderActivity" ADD CONSTRAINT "OrderActivity_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderActivity" ADD CONSTRAINT "OrderActivity_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
