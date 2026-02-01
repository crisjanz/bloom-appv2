-- CreateEnum
CREATE TYPE "GiftTokenType" AS ENUM ('BIRTHDAY_RECIPIENT_GIFT');

-- CreateEnum
CREATE TYPE "GiftTokenStatus" AS ENUM ('ACTIVE', 'CLAIMED', 'REDEEMED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "birthdayDay" INTEGER,
ADD COLUMN     "birthdayMonth" INTEGER,
ADD COLUMN     "birthdayOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "birthdayUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "birthdayYear" INTEGER;

-- CreateTable
CREATE TABLE "GiftToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "GiftTokenType" NOT NULL DEFAULT 'BIRTHDAY_RECIPIENT_GIFT',
    "status" "GiftTokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "issuedForOrderId" TEXT,
    "issuedToRecipientName" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "redeemedByCustomerId" TEXT,
    "couponId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPaymentMethod" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT,
    "stripeCustomerId" TEXT,
    "cardFingerprint" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "expMonth" INTEGER NOT NULL,
    "expYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftToken_token_key" ON "GiftToken"("token");

-- CreateIndex
CREATE INDEX "GiftToken_token_idx" ON "GiftToken"("token");

-- CreateIndex
CREATE INDEX "GiftToken_status_idx" ON "GiftToken"("status");

-- CreateIndex
CREATE INDEX "CustomerPaymentMethod_cardFingerprint_idx" ON "CustomerPaymentMethod"("cardFingerprint");

-- CreateIndex
CREATE INDEX "CustomerPaymentMethod_customerId_idx" ON "CustomerPaymentMethod"("customerId");

-- AddForeignKey
ALTER TABLE "GiftToken" ADD CONSTRAINT "GiftToken_issuedForOrderId_fkey" FOREIGN KEY ("issuedForOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftToken" ADD CONSTRAINT "GiftToken_redeemedByCustomerId_fkey" FOREIGN KEY ("redeemedByCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftToken" ADD CONSTRAINT "GiftToken_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPaymentMethod" ADD CONSTRAINT "CustomerPaymentMethod_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
