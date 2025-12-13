-- Create enums for print jobs
CREATE TYPE "PrintJobType" AS ENUM ('RECEIPT', 'ORDER_TICKET', 'REPORT');

CREATE TYPE "PrintJobStatus" AS ENUM ('PENDING', 'PRINTING', 'COMPLETED', 'FAILED');

-- Create PrintJob table
CREATE TABLE "PrintJob" (
    "id" TEXT NOT NULL,
    "type" "PrintJobType" NOT NULL,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'PENDING',
    "orderId" TEXT,
    "data" JSONB NOT NULL,
    "template" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "agentId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

-- Indexes for query performance
CREATE INDEX "PrintJob_status_idx" ON "PrintJob"("status");
CREATE INDEX "PrintJob_createdAt_idx" ON "PrintJob"("createdAt");
CREATE INDEX "PrintJob_orderId_idx" ON "PrintJob"("orderId");
CREATE INDEX "PrintJob_agentId_idx" ON "PrintJob"("agentId");

-- Foreign key to orders (cascade delete)
ALTER TABLE "PrintJob"
  ADD CONSTRAINT "PrintJob_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
