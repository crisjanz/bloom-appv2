-- Adds featuredImageUrl column to ProductVariant
ALTER TABLE "ProductVariant"
  ADD COLUMN IF NOT EXISTS "featuredImageUrl" TEXT;
