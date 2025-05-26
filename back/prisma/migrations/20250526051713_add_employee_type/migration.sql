-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('CASHIER', 'DESIGNER', 'DRIVER', 'ADMIN');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "type" "EmployeeType" NOT NULL DEFAULT 'CASHIER';
