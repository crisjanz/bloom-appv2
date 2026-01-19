-- AlreadyApplied: Capturing database drift from manual changes

-- 1. operations_settings table (already exists)
CREATE TABLE IF NOT EXISTS "operations_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "wireoutServiceFee" INTEGER NOT NULL DEFAULT 1500,
  "wireoutServiceName" TEXT NOT NULL DEFAULT 'FTD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 2. Add WIREOUT to OrderType enum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'OrderType' AND e.enumlabel = 'WIREOUT'
  ) THEN
    ALTER TYPE "OrderType" ADD VALUE 'WIREOUT';
  END IF;
END $$;

-- 3. Add wireout fields to Order table (if not exist)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "wireoutServiceFee" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "wireoutServiceName" TEXT;

-- 4. Add payment method fields (if not exist)
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "isCardPresent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "paymentSource" TEXT DEFAULT 'MANUAL';

-- 5. print_settings table (already exists)
CREATE TABLE IF NOT EXISTS "print_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storeId" TEXT,
  "receiptsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "receiptsDestination" TEXT NOT NULL DEFAULT 'browser',
  "receiptsCopies" INTEGER NOT NULL DEFAULT 1,
  "receiptsPrinterName" TEXT,
  "receiptsPrinterTray" INTEGER,
  "ticketsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "ticketsDestination" TEXT NOT NULL DEFAULT 'electron-agent',
  "ticketsPrinterName" TEXT,
  "ticketsPrinterTray" INTEGER DEFAULT 1,
  "documentsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "documentsDestination" TEXT NOT NULL DEFAULT 'browser',
  "documentsPrinterName" TEXT,
  "documentsPrinterTray" INTEGER DEFAULT 2,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "print_settings_storeId_key" UNIQUE ("storeId")
);

-- 6. Add PrintJob fields (if not exist)
ALTER TABLE "PrintJob" ADD COLUMN IF NOT EXISTS "agentType" TEXT;
ALTER TABLE "PrintJob" ADD COLUMN IF NOT EXISTS "printerName" TEXT;
ALTER TABLE "PrintJob" ADD COLUMN IF NOT EXISTS "printerTray" INTEGER;
ALTER TABLE "PrintJob" ADD COLUMN IF NOT EXISTS "copies" INTEGER NOT NULL DEFAULT 1;
