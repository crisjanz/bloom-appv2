-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PAID', 'CANCELLED', 'SCHEDULED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT NOT NULL,
    "recipientId" TEXT,
    "pickupPersonId" TEXT,
    "cardMessage" TEXT,
    "specialInstructions" TEXT,
    "occasion" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "deliveryTime" TEXT,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "couponId" TEXT,
    "gst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "customName" TEXT,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "rowTotal" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountPercent" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressShortcut" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "phoneNumbers" TEXT[],

    CONSTRAINT "AddressShortcut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pickupPersonId_fkey" FOREIGN KEY ("pickupPersonId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
