-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('RESIDENCE', 'BUSINESS', 'CHURCH', 'SCHOOL', 'FUNERAL_HOME', 'OTHER');

-- AlterTable
ALTER TABLE "ReminderSettings" ALTER COLUMN "updatedAt" DROP DEFAULT;
