-- CreateEnum
CREATE TYPE "SubscriptionBillingType" AS ENUM ('RECURRING', 'PREPAID');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SubscriptionStyle" AS ENUM ('DESIGNERS_CHOICE', 'PICK_YOUR_OWN');

-- CreateEnum
CREATE TYPE "SubscriptionFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SubscriptionDeliveryStatus" AS ENUM ('SCHEDULED', 'PREPARING', 'DELIVERED', 'SKIPPED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('POS', 'STOREFRONT');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "availableForSubscription" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "subscriptionNumber" TEXT NOT NULL,
    "billingType" "SubscriptionBillingType" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "style" "SubscriptionStyle" NOT NULL,
    "planId" TEXT,
    "colorPalette" TEXT,
    "defaultPriceCents" INTEGER NOT NULL,
    "totalPrepaidCents" INTEGER,
    "totalDeliveries" INTEGER,
    "completedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "frequency" "SubscriptionFrequency" NOT NULL,
    "preferredDayOfWeek" INTEGER,
    "customDates" TIMESTAMP(3)[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "stripeCustomerId" TEXT,
    "stripePaymentMethodId" TEXT,
    "customerId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "recipientEmail" TEXT,
    "recipientAddress" TEXT NOT NULL,
    "recipientCity" TEXT NOT NULL,
    "recipientProvince" TEXT,
    "recipientPostalCode" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "notes" TEXT,
    "source" "SubscriptionSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionDelivery" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT,
    "priceCents" INTEGER NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "deliveredDate" TIMESTAMP(3),
    "status" "SubscriptionDeliveryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "orderId" TEXT,
    "customNotes" TEXT,
    "stripePaymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentFailed" BOOLEAN NOT NULL DEFAULT false,
    "rescheduleCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_counter" (
    "id" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "prefix" TEXT NOT NULL DEFAULT 'SUB',

    CONSTRAINT "subscription_counter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_subscriptionNumber_key" ON "Subscription"("subscriptionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_accessCode_key" ON "Subscription"("accessCode");

-- CreateIndex
CREATE INDEX "Subscription_customerId_idx" ON "Subscription"("customerId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_accessCode_idx" ON "Subscription"("accessCode");

-- CreateIndex
CREATE INDEX "Subscription_subscriptionNumber_idx" ON "Subscription"("subscriptionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionDelivery_orderId_key" ON "SubscriptionDelivery"("orderId");

-- CreateIndex
CREATE INDEX "SubscriptionDelivery_subscriptionId_idx" ON "SubscriptionDelivery"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionDelivery_scheduledDate_idx" ON "SubscriptionDelivery"("scheduledDate");

-- CreateIndex
CREATE INDEX "SubscriptionDelivery_status_idx" ON "SubscriptionDelivery"("status");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionDelivery" ADD CONSTRAINT "SubscriptionDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionDelivery" ADD CONSTRAINT "SubscriptionDelivery_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionDelivery" ADD CONSTRAINT "SubscriptionDelivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
