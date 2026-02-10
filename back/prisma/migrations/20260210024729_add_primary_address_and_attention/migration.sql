-- AlterTable: Add primaryAddressId to Customer (nullable, for gradual migration)
ALTER TABLE "Customer" ADD COLUMN "primaryAddressId" TEXT;

-- AlterTable: Add attention field to Address (nullable, for gradual migration)
ALTER TABLE "Address" ADD COLUMN "attention" TEXT;

-- AlterTable: Convert addressType from enum to String (preserve existing data)
-- Step 1: Create temporary column as TEXT
ALTER TABLE "Address" ADD COLUMN "addressType_new" TEXT;

-- Step 2: Copy existing enum values to new TEXT column (cast to text)
UPDATE "Address" SET "addressType_new" = CAST("addressType" AS TEXT);

-- Step 3: Set default value for new column
ALTER TABLE "Address" ALTER COLUMN "addressType_new" SET DEFAULT 'RESIDENCE';

-- Step 4: Drop old enum column
ALTER TABLE "Address" DROP COLUMN "addressType";

-- Step 5: Rename new column to addressType
ALTER TABLE "Address" RENAME COLUMN "addressType_new" TO "addressType";

-- Step 6: Drop the AddressType enum (no longer needed)
DROP TYPE "AddressType";

-- CreateIndex: Add unique constraint on primaryAddressId
CREATE UNIQUE INDEX "Customer_primaryAddressId_key" ON "Customer"("primaryAddressId");

-- AddForeignKey: Link Customer.primaryAddressId to Address.id
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_primaryAddressId_fkey" FOREIGN KEY ("primaryAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
