-- DropIndex
DROP INDEX "provider_customers_customerId_provider_key";

-- AlterTable
ALTER TABLE "provider_customers" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "provider_customers_customerId_provider_idx" ON "provider_customers"("customerId", "provider");
