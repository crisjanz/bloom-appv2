/*
  Warnings:

  - Added the required column `type` to the `AddressShortcut` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ShortcutType" AS ENUM ('CHURCH', 'FUNERAL_HOME', 'SCHOOL', 'HOSPITAL', 'OTHER');

-- AlterTable
ALTER TABLE "AddressShortcut" ADD COLUMN     "type" "ShortcutType" NOT NULL;
