-- DropForeignKey: Remove FtdOrder -> Order relation
ALTER TABLE "ftd_orders" DROP CONSTRAINT IF EXISTS "ftd_orders_linkedOrderId_fkey";

-- DropTable: Remove FTD tables
DROP TABLE IF EXISTS "ftd_orders";
DROP TABLE IF EXISTS "ftd_settings";

-- DropEnum: Remove FTD enum
DROP TYPE IF EXISTS "FtdOrderStatus";
