/*
  Warnings:

  - You are about to drop the column `isSubscriptionAvailable` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "isSubscriptionAvailable",
ADD COLUMN     "availabilityType" TEXT DEFAULT 'always',
ADD COLUMN     "availableFrom" TIMESTAMP(3),
ADD COLUMN     "availableTo" TIMESTAMP(3),
ADD COLUMN     "holidayPreset" TEXT,
ADD COLUMN     "isTemporarilyUnavailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notAvailableFrom" TIMESTAMP(3),
ADD COLUMN     "notAvailableUntil" TIMESTAMP(3),
ADD COLUMN     "unavailableMessage" TEXT,
ADD COLUMN     "unavailableUntil" TIMESTAMP(3);
