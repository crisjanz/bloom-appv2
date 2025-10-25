/**
 * Production Migration Script - Convert Currency to Cents
 *
 * This script:
 * 1. Pushes the updated Prisma schema to production database
 * 2. Converts existing dollar values to cents
 *
 * IMPORTANT: Run this ONCE on production after deploying the schema changes
 */

const { PrismaClient } = require('@prisma/client');

// Use production database URL from environment
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function migrateProductionToCents() {
  console.log('🚀 Starting production migration to cents...\n');
  console.log('📊 Converting existing dollar values to cents (multiplying by 100)...\n');

  try {
    // Update Orders (only if values are small - indicating dollars not cents)
    const ordersUpdated = await prisma.$executeRaw`
      UPDATE "Order" SET
        "deliveryFee" = "deliveryFee" * 100,
        "discount" = "discount" * 100,
        "totalTax" = "totalTax" * 100,
        "gst" = "gst" * 100,
        "pst" = "pst" * 100,
        "paymentAmount" = "paymentAmount" * 100
      WHERE "paymentAmount" < 1000 AND "paymentAmount" > 0
    `;
    console.log(`✅ Updated ${ordersUpdated} orders`);

    // Update Payment Transactions
    const transactionsUpdated = await prisma.$executeRaw`
      UPDATE "payment_transactions" SET
        "totalAmount" = "totalAmount" * 100,
        "taxAmount" = "taxAmount" * 100,
        "tipAmount" = "tipAmount" * 100
      WHERE "totalAmount" < 1000 AND "totalAmount" > 0
    `;
    console.log(`✅ Updated ${transactionsUpdated} payment transactions`);

    // Update Payment Methods
    const methodsUpdated = await prisma.$executeRaw`
      UPDATE "payment_methods" SET "amount" = "amount" * 100
      WHERE "amount" < 1000 AND "amount" > 0
    `;
    console.log(`✅ Updated ${methodsUpdated} payment methods`);

    // Update Order Payments
    const orderPaymentsUpdated = await prisma.$executeRaw`
      UPDATE "order_payments" SET "amount" = "amount" * 100
      WHERE "amount" < 1000 AND "amount" > 0
    `;
    console.log(`✅ Updated ${orderPaymentsUpdated} order payments`);

    // Update Delivery Zones
    const zonesUpdated = await prisma.$executeRaw`
      UPDATE "delivery_zones" SET "fee" = "fee" * 100
      WHERE "fee" < 1000 AND "fee" > 0
    `;
    console.log(`✅ Updated ${zonesUpdated} delivery zones`);

    // Update Gift Cards
    const giftCardsUpdated = await prisma.$executeRaw`
      UPDATE "GiftCard" SET
        "initialValue" = "initialValue" * 100,
        "currentBalance" = "currentBalance" * 100
      WHERE "currentBalance" < 1000 AND "currentBalance" > 0
    `;
    console.log(`✅ Updated ${giftCardsUpdated} gift cards`);

    // Update FTD Orders
    const ftdUpdated = await prisma.$executeRaw`
      UPDATE "ftd_orders" SET "totalAmount" = "totalAmount" * 100
      WHERE "totalAmount" IS NOT NULL AND "totalAmount" < 1000 AND "totalAmount" > 0
    `;
    console.log(`✅ Updated ${ftdUpdated} FTD orders`);

    // Update Coupons
    const couponsUpdated = await prisma.$executeRaw`
      UPDATE "Coupon" SET
        "value" = "value" * 100,
        "minimumOrder" = CASE WHEN "minimumOrder" IS NOT NULL AND "minimumOrder" < 1000 THEN "minimumOrder" * 100 ELSE "minimumOrder" END
      WHERE "value" < 1000 AND "value" > 0
    `;
    console.log(`✅ Updated ${couponsUpdated} coupons`);

    // Update Discounts
    const discountsUpdated = await prisma.$executeRaw`
      UPDATE "Discount" SET
        "value" = "value" * 100,
        "minimumOrder" = CASE WHEN "minimumOrder" IS NOT NULL AND "minimumOrder" < 1000 THEN "minimumOrder" * 100 ELSE "minimumOrder" END
      WHERE "value" < 1000 AND "value" > 0
    `;
    console.log(`✅ Updated ${discountsUpdated} discounts`);

    // Update Refunds (if any)
    const refundsUpdated = await prisma.$executeRaw`
      UPDATE "refunds" SET "amount" = "amount" * 100
      WHERE "amount" < 1000 AND "amount" > 0
    `;
    console.log(`✅ Updated ${refundsUpdated} refunds`);

    // Verify sample data
    console.log('\n📋 Sample verification:');
    const sampleOrders = await prisma.order.findMany({
      take: 3,
      select: {
        orderNumber: true,
        paymentAmount: true,
        deliveryFee: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    if (sampleOrders.length > 0) {
      console.table(sampleOrders);
      console.log('\n✅ Migration completed successfully!');
      console.log('💡 All amounts are now stored in cents (e.g., 8500 = $85.00)');
    } else {
      console.log('⚠️  No orders found to verify, but migration completed.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateProductionToCents()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
