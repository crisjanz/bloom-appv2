-- CreateTable
CREATE TABLE "ProductCategoryLink" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ProductCategoryLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductCategoryLink_productId_idx" ON "ProductCategoryLink"("productId");

-- CreateIndex
CREATE INDEX "ProductCategoryLink_categoryId_idx" ON "ProductCategoryLink"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategoryLink_productId_categoryId_key" ON "ProductCategoryLink"("productId", "categoryId");

-- AddForeignKey
ALTER TABLE "ProductCategoryLink" ADD CONSTRAINT "ProductCategoryLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategoryLink" ADD CONSTRAINT "ProductCategoryLink_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
