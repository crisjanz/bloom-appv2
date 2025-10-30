/**
 * Backfill PT-transactions for existing FTD orders
 *
 * This script creates payment transactions for FTD orders that were imported
 * before PT-transaction creation was added to the FTD import flow.
 */

import { PrismaClient } from '@prisma/client';
import transactionService from '../services/transactionService';

const prisma = new PrismaClient();

async function backfillFtdTransactions() {
  console.log('🔄 Starting FTD payment transaction backfill...\n');

  try {
    // Find all FTD orders with linked Bloom orders
    const ftdOrders = await prisma.ftdOrder.findMany({
      where: {
        linkedOrderId: {
          not: null
        }
      },
      include: {
        linkedOrder: {
          include: {
            customer: true,
            orderPayments: {
              include: {
                transaction: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📦 Found ${ftdOrders.length} FTD orders with linked Bloom orders\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const ftdOrder of ftdOrders) {
      const bloomOrder = ftdOrder.linkedOrder;

      if (!bloomOrder) {
        console.log(`⚠️  FTD ${ftdOrder.externalId}: No linked Bloom order found`);
        skipped++;
        continue;
      }

      // Check if transaction already exists for this order
      const existingTransaction = bloomOrder.orderPayments.find(op => op.transaction);

      if (existingTransaction) {
        console.log(`✓ FTD ${ftdOrder.externalId} → Order #${bloomOrder.orderNumber}: PT-transaction already exists (${existingTransaction.transaction.transactionNumber})`);
        skipped++;
        continue;
      }

      // Create payment transaction
      // NOTE: All amounts stored in cents for consistency
      try {
        const paymentTransaction = await transactionService.createTransaction({
          customerId: bloomOrder.customerId,
          employeeId: undefined, // FTD orders are automated
          channel: 'WEBSITE', // Use WEBSITE as proxy for wire-in orders
          totalAmount: ftdOrder.totalAmount || 0, // Already in cents
          taxAmount: 0, // FTD includes tax in total
          tipAmount: 0,
          notes: `FTD Wire-In Order ${ftdOrder.externalId} (backfilled)`,
          receiptEmail: undefined,
          paymentMethods: [{
            type: 'FTD' as any, // FTD wire-in payment (pre-paid via FTD network)
            provider: 'INTERNAL' as any,
            amount: ftdOrder.totalAmount || 0, // Already in cents
            providerTransactionId: ftdOrder.externalId,
            providerMetadata: {
              source: 'FTD',
              ftdOrderId: ftdOrder.id,
              sendingFlorist: ftdOrder.sendingFloristCode || 'unknown',
              backfilled: true,
              backfilledAt: new Date().toISOString()
            }
          }],
          orderIds: [bloomOrder.id]
        });

        console.log(`✅ FTD ${ftdOrder.externalId} → Order #${bloomOrder.orderNumber}: Created ${paymentTransaction.transactionNumber} ($${(ftdOrder.totalAmount / 100).toFixed(2)})`);
        created++;
      } catch (error: any) {
        console.error(`❌ FTD ${ftdOrder.externalId} → Order #${bloomOrder.orderNumber}: Failed to create transaction: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n📊 Backfill Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📦 Total processed: ${ftdOrders.length}`);

  } catch (error: any) {
    console.error('\n❌ Backfill failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillFtdTransactions()
  .then(() => {
    console.log('\n✅ Backfill completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  });
