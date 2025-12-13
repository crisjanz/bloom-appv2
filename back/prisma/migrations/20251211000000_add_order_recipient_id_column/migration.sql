-- Record legacy recipientId column on Order table
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "recipientId" TEXT;
