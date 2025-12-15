/*
  Warnings:

  - You are about to drop the column `featuredCategoryIds` on the `HomepageSettings` table. All the data in the column will be lost.
  - You are about to drop the column `seasonalProducts` on the `HomepageSettings` table. All the data in the column will be lost.
  - You are about to drop the `HomepageBanner` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "HomepageSettings" DROP COLUMN "featuredCategoryIds",
DROP COLUMN "seasonalProducts";

-- AlterTable
ALTER TABLE "PrintJob" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "HomepageBanner";
