-- Modify payment settings structure to support provider toggles, encrypted credentials, and offline methods

-- Create new enum for provider modes
CREATE TYPE "PaymentProviderMode" AS ENUM ('TERMINAL', 'MANUAL', 'HYBRID');

-- Allow PayPal as a provider option
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'PAYPAL';

-- Update payment_settings table with new columns and enums
ALTER TABLE "payment_settings"
  ADD COLUMN     "defaultCardProvider" "PaymentProvider",
  ADD COLUMN     "stripeEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "stripeAccountId" TEXT,
  ADD COLUMN     "squareEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "paypalEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "paypalEnvironment" TEXT,
  ADD COLUMN     "paypalClientId" TEXT,
  ADD COLUMN     "paypalClientSecret" TEXT,
  ADD COLUMN     "allowSplitPayments" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "allowOfflineNotes" BOOLEAN NOT NULL DEFAULT true;

-- Convert Stripe mode column to enum
ALTER TABLE "payment_settings"
  ALTER COLUMN "stripeMode" DROP DEFAULT;

ALTER TABLE "payment_settings"
  ALTER COLUMN "stripeMode" TYPE "PaymentProviderMode"
  USING CASE
    WHEN "stripeMode" ILIKE 'manual' THEN 'MANUAL'::"PaymentProviderMode"
    WHEN "stripeMode" ILIKE 'hybrid' THEN 'HYBRID'::"PaymentProviderMode"
    ELSE 'TERMINAL'::"PaymentProviderMode"
  END;

ALTER TABLE "payment_settings"
  ALTER COLUMN "stripeMode" SET DEFAULT 'TERMINAL';

-- Convert Square mode column to enum
ALTER TABLE "payment_settings"
  ALTER COLUMN "squareMode" DROP DEFAULT;

ALTER TABLE "payment_settings"
  ALTER COLUMN "squareMode" TYPE "PaymentProviderMode"
  USING CASE
    WHEN "squareMode" ILIKE 'manual' THEN 'MANUAL'::"PaymentProviderMode"
    WHEN "squareMode" ILIKE 'hybrid' THEN 'HYBRID'::"PaymentProviderMode"
    ELSE 'TERMINAL'::"PaymentProviderMode"
  END;

ALTER TABLE "payment_settings"
  ALTER COLUMN "squareMode" SET DEFAULT 'TERMINAL';

-- Existing credential columns are now optional
ALTER TABLE "payment_settings"
  ALTER COLUMN "stripePublicKey" DROP NOT NULL,
  ALTER COLUMN "stripeSecretKey" DROP NOT NULL,
  ALTER COLUMN "squareAppId" DROP NOT NULL,
  ALTER COLUMN "squareAccessToken" DROP NOT NULL,
  ALTER COLUMN "squareLocationId" DROP NOT NULL;

-- Offline payment method support ------------------------------------------------
CREATE TABLE "offline_payment_methods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "visibleOnPos" BOOLEAN NOT NULL DEFAULT true,
    "visibleOnTakeOrder" BOOLEAN NOT NULL DEFAULT true,
    "requiresReference" BOOLEAN NOT NULL DEFAULT false,
    "allowChangeTracking" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "offline_payment_methods_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "offline_payment_methods_code_key" UNIQUE ("code")
);

ALTER TABLE "payment_methods"
  ADD COLUMN "offlineMethodId" TEXT;

ALTER TABLE "payment_methods"
  ADD CONSTRAINT "payment_methods_offlineMethodId_fkey"
    FOREIGN KEY ("offlineMethodId") REFERENCES "offline_payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
