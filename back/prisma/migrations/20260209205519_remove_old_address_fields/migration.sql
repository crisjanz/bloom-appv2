-- DropForeignKey: Remove homeAddress foreign key constraint
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_homeAddressId_fkey";

-- DropIndex: Remove homeAddressId unique constraint
DROP INDEX IF EXISTS "Customer_homeAddressId_key";

-- AlterTable: Drop old fields from Customer
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "homeAddressId";

-- AlterTable: Drop old fields from Address
ALTER TABLE "Address" DROP COLUMN IF EXISTS "label";
ALTER TABLE "Address" DROP COLUMN IF EXISTS "firstName";
ALTER TABLE "Address" DROP COLUMN IF EXISTS "lastName";
