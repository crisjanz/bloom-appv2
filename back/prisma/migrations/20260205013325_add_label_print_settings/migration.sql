-- AlterEnum
ALTER TYPE "PrintJobType" ADD VALUE 'LABEL';

-- AlterTable
ALTER TABLE "print_settings" ADD COLUMN     "labelsDestination" TEXT NOT NULL DEFAULT 'electron-agent',
ADD COLUMN     "labelsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "labelsPrinterName" TEXT,
ADD COLUMN     "labelsPrinterTray" INTEGER;
