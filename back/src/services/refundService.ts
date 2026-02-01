import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import paymentProviderFactory from './paymentProviders/PaymentProviderFactory';

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
      | 'COD'
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

    const refundMethods = await Promise.all(
      data.refundMethods.map(async (method) => {
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

      await Promise.all(
        data.orderRefunds.map(async (orderRefund) => {
          const order = await tx.order.findUnique({
            where: { id: orderRefund.orderId },
            include: { orderRefunds: true }
          });

          if (!order) {
            return;
          }

          const totalRefunded = order.orderRefunds.reduce((sum, r) => sum + r.amount, 0);
          let newStatus = order.status;

          if (totalRefunded >= order.paymentAmount) {
            newStatus = 'REFUNDED';
          } else if (totalRefunded > 0) {
            newStatus = 'PARTIALLY_REFUNDED';
          }

          if (newStatus !== order.status) {
            await tx.order.update({
              where: { id: orderRefund.orderId },
              data: { status: newStatus }
            });
          }
        })
      );

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
