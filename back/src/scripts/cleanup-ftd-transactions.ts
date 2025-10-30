/**
 * Cleanup incorrectly created FTD PT-transactions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Cleaning up incorrect FTD PT-transactions...\n');

  try {
    // Find FTD transactions to delete (PT-00041 to PT-00061)
    const transactionsToDelete = [];
    for (let i = 41; i <= 61; i++) {
      transactionsToDelete.push(`PT-${String(i).padStart(5, '0')}`);
    }

    const ftdTransactions = await prisma.paymentTransaction.findMany({
      where: {
        transactionNumber: {
          in: transactionsToDelete
        }
      },
      include: {
        orderPayments: true,
        paymentMethods: true,
        refunds: true
      }
    });

    console.log(`Found ${ftdTransactions.length} FTD transactions to delete`);

    for (const transaction of ftdTransactions) {
      await prisma.$transaction(async (tx) => {
        // Delete order payments first
        await tx.orderPayment.deleteMany({
          where: { transactionId: transaction.id }
        });

        // Delete payment methods
        await tx.paymentMethod.deleteMany({
          where: { transactionId: transaction.id }
        });

        // Delete refunds if any
        await tx.refund.deleteMany({
          where: { transactionId: transaction.id }
        });

        // Delete the transaction
        await tx.paymentTransaction.delete({
          where: { id: transaction.id }
        });

        console.log(`✅ Deleted ${transaction.transactionNumber}`);
      });
    }

    console.log(`\n✅ Cleanup complete! Deleted ${ftdTransactions.length} transactions`);

  } catch (error: any) {
    console.error('\n❌ Cleanup failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
