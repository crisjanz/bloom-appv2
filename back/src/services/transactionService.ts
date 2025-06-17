import prisma from '../lib/prisma';

export interface CreateTransactionData {
  customerId: string;
  employeeId?: string;
  channel: 'POS' | 'PHONE' | 'WEBSITE';
  totalAmount: number;
  taxAmount?: number;
  tipAmount?: number;
  notes?: string;
  receiptEmail?: string;
  paymentMethods: PaymentMethodData[];
  orderIds: string[];
}

export interface PaymentMethodData {
  type: 'CASH' | 'CARD' | 'GIFT_CARD' | 'STORE_CREDIT' | 'CHECK' | 'COD';
  provider: 'STRIPE' | 'SQUARE' | 'INTERNAL';
  amount: number;
  providerTransactionId?: string;
  providerMetadata?: any;
  cardLast4?: string;
  cardBrand?: string;
  giftCardNumber?: string;
  checkNumber?: string;
}

class TransactionService {
  /**
   * Generate next PT-XXXX transaction number
   */
  async generateTransactionNumber(): Promise<string> {
    const result = await prisma.$transaction(async (tx) => {
      // Get or create the counter
      let counter = await tx.transactionCounter.findFirst();
      
      if (!counter) {
        // Initialize counter if it doesn't exist
        counter = await tx.transactionCounter.create({
          data: {
            currentValue: 1,
            prefix: 'PT'
          }
        });
      } else {
        // Increment the counter
        counter = await tx.transactionCounter.update({
          where: { id: counter.id },
          data: {
            currentValue: counter.currentValue + 1
          }
        });
      }
      
      return counter;
    });
    
    // Format as PT-00001, PT-00002, etc.
    const paddedNumber = result.currentValue.toString().padStart(5, '0');
    return `${result.prefix}-${paddedNumber}`;
  }

  /**
   * Create a new payment transaction with all related data
   */
  async createTransaction(data: CreateTransactionData) {
    const transactionNumber = await this.generateTransactionNumber();
    
    return await prisma.$transaction(async (tx) => {
      // Create the main payment transaction
      const paymentTransaction = await tx.paymentTransaction.create({
        data: {
          transactionNumber,
          channel: data.channel,
          totalAmount: data.totalAmount,
          taxAmount: data.taxAmount || 0,
          tipAmount: data.tipAmount || 0,
          customerId: data.customerId,
          employeeId: data.employeeId,
          notes: data.notes,
          receiptEmail: data.receiptEmail,
          status: 'PROCESSING'
        }
      });

      // Create payment methods
      const paymentMethods = await Promise.all(
        data.paymentMethods.map(method => 
          tx.paymentMethod.create({
            data: {
              transactionId: paymentTransaction.id,
              type: method.type,
              provider: method.provider,
              amount: method.amount,
              providerTransactionId: method.providerTransactionId,
              providerMetadata: method.providerMetadata,
              cardLast4: method.cardLast4,
              cardBrand: method.cardBrand,
              giftCardNumber: method.giftCardNumber,
              checkNumber: method.checkNumber
            }
          })
        )
      );

      // Create order payment links
      const orderPayments = await Promise.all(
        data.orderIds.map(async (orderId) => {
          // Get order total to calculate payment amount
          const order = await tx.order.findUnique({
            where: { id: orderId },
            select: { paymentAmount: true }
          });
          
          return tx.orderPayment.create({
            data: {
              transactionId: paymentTransaction.id,
              orderId: orderId,
              amount: order?.paymentAmount || 0
            }
          });
        })
      );

      // Update transaction status to completed if all payments succeeded
      const updatedTransaction = await tx.paymentTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        },
        include: {
          customer: true,
          employee: true,
          paymentMethods: true,
          orderPayments: {
            include: {
              order: true
            }
          }
        }
      });

      // Update all associated orders to PAID status when transaction completes
      await Promise.all(
        data.orderIds.map(orderId =>
          tx.order.update({
            where: { id: orderId },
            data: { status: 'PAID' }
          })
        )
      );

      return updatedTransaction;
    });
  }

  /**
   * Get transaction with all related data
   */
  async getTransaction(transactionNumber: string) {
    return await prisma.paymentTransaction.findUnique({
      where: { transactionNumber },
      include: {
        customer: true,
        employee: true,
        paymentMethods: true,
        orderPayments: {
          include: {
            order: {
              include: {
                orderItems: {
                  include: {
                    product: true
                  }
                }
              }
            }
          }
        },
        refunds: {
          include: {
            refundMethods: true,
            employee: true
          }
        }
      }
    });
  }

  /**
   * Process a refund for a transaction
   */
  async processRefund(transactionId: string, refundData: {
    amount: number;
    reason?: string;
    employeeId?: string;
    refundMethods: {
      paymentMethodType: 'CASH' | 'CARD' | 'GIFT_CARD' | 'STORE_CREDIT' | 'CHECK' | 'COD';
      provider: 'STRIPE' | 'SQUARE' | 'INTERNAL';
      amount: number;
      providerRefundId?: string;
    }[];
  }) {
    return await prisma.$transaction(async (tx) => {
      // Generate refund number (RF-XXXXX)
      const refundNumber = await this.generateRefundNumber(tx);
      
      // Create refund record
      const refund = await tx.refund.create({
        data: {
          transactionId,
          refundNumber,
          amount: refundData.amount,
          reason: refundData.reason,
          employeeId: refundData.employeeId
        }
      });

      // Create refund methods
      await Promise.all(
        refundData.refundMethods.map(method =>
          tx.refundMethod.create({
            data: {
              refundId: refund.id,
              paymentMethodType: method.paymentMethodType,
              provider: method.provider,
              amount: method.amount,
              providerRefundId: method.providerRefundId
            }
          })
        )
      );

      // Update transaction status
      const transaction = await tx.paymentTransaction.findUnique({
        where: { id: transactionId },
        include: { refunds: true }
      });

      if (transaction) {
        const totalRefunded = transaction.refunds.reduce((sum, r) => sum + r.amount, 0);
        const newStatus = totalRefunded >= transaction.totalAmount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        
        await tx.paymentTransaction.update({
          where: { id: transactionId },
          data: { status: newStatus }
        });
      }

      return refund;
    });
  }

  /**
   * Generate refund number (RF-XXXXX)
   */
  private async generateRefundNumber(tx: any): Promise<string> {
    // For simplicity, we'll use a similar counter but with RF prefix
    // You could create a separate RefundCounter table if needed
    const count = await tx.refund.count();
    const paddedNumber = (count + 1).toString().padStart(5, '0');
    return `RF-${paddedNumber}`;
  }

  /**
   * Get transaction history for a customer
   */
  async getCustomerTransactions(customerId: string) {
    return await prisma.paymentTransaction.findMany({
      where: { customerId },
      include: {
        paymentMethods: true,
        orderPayments: {
          include: {
            order: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get daily transaction summary
   */
  async getDailyTransactionSummary(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: 'COMPLETED'
      },
      include: {
        paymentMethods: true
      }
    });

    const summary = {
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + t.totalAmount, 0),
      totalTax: transactions.reduce((sum, t) => sum + t.taxAmount, 0),
      totalTips: transactions.reduce((sum, t) => sum + t.tipAmount, 0),
      paymentMethodBreakdown: {} as Record<string, { count: number; amount: number }>
    };

    // Calculate payment method breakdown
    transactions.forEach(transaction => {
      transaction.paymentMethods.forEach(method => {
        const key = `${method.type}_${method.provider}`;
        if (!summary.paymentMethodBreakdown[key]) {
          summary.paymentMethodBreakdown[key] = { count: 0, amount: 0 };
        }
        summary.paymentMethodBreakdown[key].count++;
        summary.paymentMethodBreakdown[key].amount += method.amount;
      });
    });

    return summary;
  }
}

export default new TransactionService();