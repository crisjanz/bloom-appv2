-- CreateTable
CREATE TABLE "WireProductLibrary" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "source" TEXT,
    "externalUrl" TEXT,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WireProductLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WireProductLibrary_productCode_key" ON "WireProductLibrary"("productCode");

-- CreateIndex
CREATE INDEX "WireProductLibrary_productCode_idx" ON "WireProductLibrary"("productCode");

-- CreateIndex
CREATE INDEX "WireProductLibrary_source_idx" ON "WireProductLibrary"("source");
