-- Add built-in payment method toggles to payment settings
ALTER TABLE "payment_settings"
  ADD COLUMN "codEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "houseAccountEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "checkEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Extend payment method type enum for reporting granularity
ALTER TYPE "PaymentMethodType" ADD VALUE IF NOT EXISTS 'HOUSE_ACCOUNT';
ALTER TYPE "PaymentMethodType" ADD VALUE IF NOT EXISTS 'OFFLINE';
