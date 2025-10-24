-- Add external source enum
DO $$ BEGIN
  CREATE TYPE "OrderExternalSource" AS ENUM ('FTD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to orders
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "externalSource" "OrderExternalSource",
  ADD COLUMN IF NOT EXISTS "externalReference" TEXT,
  ADD COLUMN IF NOT EXISTS "importedPayload" JSONB,
  ADD COLUMN IF NOT EXISTS "externalStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "needsExternalUpdate" BOOLEAN NOT NULL DEFAULT FALSE;

-- Create indexes/constraints
DO $$ BEGIN
  CREATE UNIQUE INDEX "orders_externalReference_key" ON "orders" ("externalReference");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX "orders_externalSource_idx" ON "orders" ("externalSource");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop legacy FTD table and enum if they exist
DROP TABLE IF EXISTS "ftd_orders";
DO $$ BEGIN
  DROP TYPE "FtdOrderStatus";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
