/*
  Warnings:

  - You are about to drop the column `label` on the `Address` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[homeAddressId]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `firstName` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Address` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_customerId_fkey";

-- AlterTable
ALTER TABLE "Address" DROP COLUMN "label",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "homeAddressId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_homeAddressId_key" ON "Customer"("homeAddressId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_homeAddressId_fkey" FOREIGN KEY ("homeAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
