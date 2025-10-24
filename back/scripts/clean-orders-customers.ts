import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("🧹 Starting database cleanup...");
  console.log("⚠️  This will delete ALL orders and customers (keeping settings, products, employees)");

  try {
    // Delete in order to respect foreign key constraints

    console.log("1️⃣ Deleting order payments...");
    await prisma.orderPayment.deleteMany({});

    console.log("2️⃣ Deleting order items...");
    await prisma.orderItem.deleteMany({});

    console.log("3️⃣ Deleting all orders...");
    const ordersDeleted = await prisma.order.deleteMany({});
    console.log(`   ✅ Deleted ${ordersDeleted.count} orders`);

    console.log("4️⃣ Deleting customer-recipient relationships...");
    await prisma.customerRecipient.deleteMany({});

    console.log("5️⃣ Deleting addresses...");
    const addressesDeleted = await prisma.address.deleteMany({});
    console.log(`   ✅ Deleted ${addressesDeleted.count} addresses`);

    console.log("6️⃣ Deleting saved payment methods...");
    await prisma.savedPaymentMethod.deleteMany({});

    console.log("7️⃣ Deleting all customers...");
    const customersDeleted = await prisma.customer.deleteMany({});
    console.log(`   ✅ Deleted ${customersDeleted.count} customers`);

    console.log("8️⃣ Deleting FTD orders...");
    await prisma.$executeRaw`DELETE FROM ftd_orders`;
    console.log(`   ✅ Deleted FTD orders`);

    console.log("9️⃣ Resetting order number sequence...");
    await prisma.$executeRaw`ALTER SEQUENCE "Order_orderNumber_seq" RESTART WITH 1`;
    console.log("   ✅ Order numbers will start from #1");

    console.log("\n✅ Database cleanup complete!");
    console.log("\n📋 What was kept:");
    console.log("   ✅ Products & Categories");
    console.log("   ✅ Employees");
    console.log("   ✅ Business Settings");
    console.log("   ✅ FTD Settings");
    console.log("   ✅ Tax Rates");
    console.log("   ✅ Delivery Charges");
    console.log("   ✅ Discounts & Coupons");
    console.log("   ✅ Gift Cards");

    console.log("\n🗑️  What was deleted:");
    console.log("   ❌ All Orders");
    console.log("   ❌ All Customers");
    console.log("   ❌ All Addresses");
    console.log("   ❌ All FTD Orders");

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase()
  .then(() => {
    console.log("\n✨ Ready for fresh start!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to clean database:", error);
    process.exit(1);
  });
