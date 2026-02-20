import prisma from '../lib/prisma';
import { HouseAccountEntryType, OrderActivityType, Prisma } from '@prisma/client';
import paymentProviderFactory from './paymentProviders/PaymentProviderFactory';
import { recalculateOrderPaymentStatuses } from './orderPaymentStatusService';
import { logOrderActivity } from './orderActivityService';

interface RefundItemBreakdown {
  orderItemId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
}

interface ProcessRefundData {
  transactionId: string;
  refundType: 'FULL' | 'PARTIAL';
  totalAmount: number;
  reason?: string;
  employeeId?: string;
  orderRefunds: {
    orderId: string;
    amount: number;
  }[];
  itemBreakdown?: RefundItemBreakdown[];
  taxRefunded?: number;
  deliveryFeeRefunded?: number;
  refundMethods: {
    paymentMethodType:
      | 'CASH'
      | 'CARD'
      | 'GIFT_CARD'
      | 'STORE_CREDIT'
      | 'CHECK'
      | 'PAY_LATER'
      | 'EXTERNAL'
      | 'HOUSE_ACCOUNT'
      | 'OFFLINE';
    provider: 'STRIPE' | 'SQUARE' | 'INTERNAL';
    amount: number;
    providerTransactionId?: string;
    providerRefundId?: string;
    status?: string;
  }[];
}

class RefundService {
  async processRefund(data: ProcessRefundData) {
    const shouldProcessStripe = data.refundMethods.some(
      (method) =>
        method.provider === 'STRIPE' &&
        method.paymentMethodType === 'CARD' &&
        !method.providerRefundId
    );
    const stripe = shouldProcessStripe ? await paymentProviderFactory.getStripeClient() : null;

    const normalizedMethods = data.refundMethods.map((method) => ({
      ...method,
      paymentMethodType:
        String(method.paymentMethodType || '').toUpperCase() === 'COD'
          ? 'PAY_LATER'
          : method.paymentMethodType,
    }));

    const refundMethods = await Promise.all(
      normalizedMethods.map(async (method) => {
        if (
          method.provider === 'STRIPE' &&
          method.paymentMethodType === 'CARD' &&
          !method.providerRefundId
        ) {
          if (!method.providerTransactionId) {
            throw new Error('Stripe refund requires providerTransactionId');
          }

          const stripeRefund = await stripe!.refunds.create({
            payment_intent: method.providerTransactionId,
            amount: Math.round(method.amount)
          });

          return {
            ...method,
            providerRefundId: stripeRefund.id,
            status: stripeRefund.status || method.status
          };
        }

        return method;
      })
    );
    const refundMethodLabels = refundMethods.map(
      (method) => `${method.paymentMethodType} (${method.provider})`
    );

    return await prisma.$transaction(async (tx) => {
      const refundNumber = await this.generateRefundNumber(tx);

      const refund = await tx.refund.create({
        data: {
          transactionId: data.transactionId,
          refundNumber,
          amount: data.totalAmount,
          reason: data.reason,
          employeeId: data.employeeId,
          refundType: data.refundType,
          itemBreakdown: (data.itemBreakdown || []) as unknown as Prisma.InputJsonValue,
          taxRefunded: data.taxRefunded || 0,
          deliveryFeeRefunded: data.deliveryFeeRefunded || 0
        }
      });

      await Promise.all(
        refundMethods.map((method) =>
          tx.refundMethod.create({
            data: {
              refundId: refund.id,
              paymentMethodType: method.paymentMethodType,
              provider: method.provider,
              amount: method.amount,
              providerRefundId: method.providerRefundId,
              status: method.status || 'completed'
            }
          })
        )
      );

      await Promise.all(
        data.orderRefunds.map((orderRefund) =>
          tx.orderRefund.create({
            data: {
              refundId: refund.id,
              orderId: orderRefund.orderId,
              amount: orderRefund.amount
            }
          })
        )
      );
      await recalculateOrderPaymentStatuses(
        tx,
        data.orderRefunds.map((orderRefund) => orderRefund.orderId)
      );

      await Promise.all(
        data.orderRefunds
          .filter((orderRefund) => orderRefund.amount > 0)
          .map((orderRefund) =>
            logOrderActivity({
              tx,
              orderId: orderRefund.orderId,
              type: OrderActivityType.REFUND_PROCESSED,
              summary: `Refund processed (${refund.refundNumber})`,
              details: {
                refundNumber: refund.refundNumber,
                amount: orderRefund.amount,
                reason: data.reason || null,
                refundType: data.refundType,
                methods: refundMethodLabels,
                transactionId: data.transactionId,
              },
              actorId: data.employeeId || null,
            })
          )
      );

      // Reverse house account ledger if refund includes HOUSE_ACCOUNT method
      const haRefundMethods = refundMethods.filter((m) => m.paymentMethodType === 'HOUSE_ACCOUNT');
      if (haRefundMethods.length > 0) {
        const origTransaction = await tx.paymentTransaction.findUnique({
          where: { id: data.transactionId },
          select: { customerId: true },
        });

        if (origTransaction?.customerId) {
          const haRefundTotal = haRefundMethods.reduce((sum, m) => sum + m.amount, 0);
          const latestEntry = await tx.houseAccountLedger.findFirst({
            where: { customerId: origTransaction.customerId },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          });
          const previousBalance = latestEntry?.balance ?? 0;
          const creditAmount = Math.abs(haRefundTotal) * -1;

          await tx.houseAccountLedger.create({
            data: {
              customerId: origTransaction.customerId,
              type: HouseAccountEntryType.ADJUSTMENT,
              amount: creditAmount,
              balance: previousBalance + creditAmount,
              description: `Refund - ${refund.refundNumber}`,
              reference: refund.refundNumber,
              createdBy: data.employeeId || null,
            },
          });
        }
      }

      const transaction = await tx.paymentTransaction.findUnique({
        where: { id: data.transactionId },
        include: { refunds: true }
      });

      if (transaction) {
        const totalRefunded = transaction.refunds.reduce((sum, r) => sum + r.amount, 0);
        const newStatus = totalRefunded >= transaction.totalAmount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

        await tx.paymentTransaction.update({
          where: { id: data.transactionId },
          data: { status: newStatus }
        });
      }

      return refund;
    });
  }

  async getRefundDetails(refundNumber: string) {
    return await prisma.refund.findUnique({
      where: { refundNumber },
      include: {
        refundMethods: true,
        orderRefunds: {
          include: {
            order: {
              include: {
                orderItems: true
              }
            }
          }
        },
        employee: true,
        transaction: {
          include: {
            customer: true,
            paymentMethods: true,
            orderPayments: {
              include: {
                order: true
              }
            }
          }
        }
      }
    });
  }

  private async generateRefundNumber(tx: any): Promise<string> {
    const count = await tx.refund.count();
    const paddedNumber = (count + 1).toString().padStart(5, '0');
    return `RF-${paddedNumber}`;
  }
}

export default new RefundService();
