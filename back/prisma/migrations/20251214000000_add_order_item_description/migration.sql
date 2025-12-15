-- Add description column for custom order items
ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "description" TEXT;
