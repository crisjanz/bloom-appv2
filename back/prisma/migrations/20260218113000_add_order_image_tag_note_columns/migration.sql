-- Add missing metadata columns for categorized order images.
-- Safe to run even if columns already exist.
ALTER TABLE "OrderImage"
ADD COLUMN IF NOT EXISTS "tag" TEXT;

ALTER TABLE "OrderImage"
ADD COLUMN IF NOT EXISTS "note" TEXT;
