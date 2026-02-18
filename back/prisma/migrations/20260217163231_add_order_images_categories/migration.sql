-- CreateEnum
CREATE TYPE "OrderImageCategory" AS ENUM ('REFERENCE', 'FULFILLED', 'DELIVERED', 'OTHER');

-- CreateTable
CREATE TABLE "OrderImage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "category" "OrderImageCategory" NOT NULL DEFAULT 'OTHER',
    "url" TEXT NOT NULL,
    "tag" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderImage_orderId_idx" ON "OrderImage"("orderId");

-- CreateIndex
CREATE INDEX "OrderImage_category_idx" ON "OrderImage"("category");

-- CreateIndex
CREATE INDEX "OrderImage_orderId_category_idx" ON "OrderImage"("orderId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "OrderImage_orderId_category_url_key" ON "OrderImage"("orderId", "category", "url");

-- AddForeignKey
ALTER TABLE "OrderImage" ADD CONSTRAINT "OrderImage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
