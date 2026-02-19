import { PaymentMethodType, PaymentStatus, Prisma } from '@prisma/client';

const NON_SETTLING_PAYMENT_METHODS = new Set<PaymentMethodType>([
  PaymentMethodType.PAY_LATER,
  PaymentMethodType.HOUSE_ACCOUNT,
]);

const isSettlingMethod = (type: PaymentMethodType) => !NON_SETTLING_PAYMENT_METHODS.has(type);

const calculateSettledTransactionRatio = (transaction: {
  totalAmount: number;
  paymentMethods: Array<{ type: PaymentMethodType; amount: number }>;
}) => {
  const methods = Array.isArray(transaction.paymentMethods) ? transaction.paymentMethods : [];
  if (methods.length === 0) return 1;

  const settledAmount = methods
    .filter((method) => isSettlingMethod(method.type))
    .reduce((sum, method) => sum + (method.amount || 0), 0);

  if (settledAmount <= 0) return 0;

  const transactionTotal =
    transaction.totalAmount > 0
      ? transaction.totalAmount
      : methods.reduce((sum, method) => sum + (method.amount || 0), 0);

  if (transactionTotal <= 0) return 1;

  return Math.min(1, settledAmount / transactionTotal);
};

const calculateSettledRefundRatio = (refund: {
  amount: number;
  refundMethods: Array<{ paymentMethodType: PaymentMethodType; amount: number }>;
}) => {
  const methods = Array.isArray(refund.refundMethods) ? refund.refundMethods : [];
  if (methods.length === 0) return 1;

  const settledAmount = methods
    .filter((method) => isSettlingMethod(method.paymentMethodType))
    .reduce((sum, method) => sum + (method.amount || 0), 0);

  if (settledAmount <= 0) return 0;

  const refundTotal =
    refund.amount > 0
      ? refund.amount
      : methods.reduce((sum, method) => sum + (method.amount || 0), 0);

  if (refundTotal <= 0) return 1;

  return Math.min(1, settledAmount / refundTotal);
};

const resolveOrderPaymentStatus = ({
  orderAmount,
  settledPaid,
  settledRefunded,
}: {
  orderAmount: number;
  settledPaid: number;
  settledRefunded: number;
}) => {
  const roundedPaid = Math.max(0, Math.round(settledPaid));
  const roundedRefunded = Math.max(0, Math.round(settledRefunded));
  const expectedAmount = Math.max(0, Math.round(orderAmount));

  if (roundedPaid <= 0) {
    return PaymentStatus.UNPAID;
  }

  if (roundedRefunded >= roundedPaid) {
    return PaymentStatus.REFUNDED;
  }

  if (roundedRefunded > 0) {
    return PaymentStatus.PARTIALLY_REFUNDED;
  }

  if (expectedAmount === 0 || roundedPaid >= expectedAmount) {
    return PaymentStatus.PAID;
  }

  return PaymentStatus.PARTIALLY_PAID;
};

export async function recalculateOrderPaymentStatuses(
  tx: Prisma.TransactionClient,
  orderIds: string[]
) {
  const uniqueOrderIds = Array.from(
    new Set(
      (orderIds || []).filter(
        (orderId): orderId is string => typeof orderId === 'string' && orderId.trim().length > 0
      )
    )
  );

  if (uniqueOrderIds.length === 0) {
    return;
  }

  const orders = await tx.order.findMany({
    where: {
      id: { in: uniqueOrderIds },
    },
    select: {
      id: true,
      paymentAmount: true,
      paymentStatus: true,
      orderPayments: {
        where: {
          transaction: {
            status: 'COMPLETED',
          },
        },
        select: {
          amount: true,
          transaction: {
            select: {
              totalAmount: true,
              paymentMethods: {
                select: {
                  type: true,
                  amount: true,
                },
              },
            },
          },
        },
      },
      orderRefunds: {
        select: {
          amount: true,
          refund: {
            select: {
              amount: true,
              refundMethods: {
                select: {
                  paymentMethodType: true,
                  amount: true,
                },
              },
            },
          },
        },
      },
    },
  });

  await Promise.all(
    orders.map(async (order) => {
      const settledPaid = order.orderPayments.reduce((sum, orderPayment) => {
        const ratio = calculateSettledTransactionRatio(orderPayment.transaction);
        return sum + (orderPayment.amount || 0) * ratio;
      }, 0);

      const settledRefunded = order.orderRefunds.reduce((sum, orderRefund) => {
        const ratio = calculateSettledRefundRatio(orderRefund.refund);
        return sum + (orderRefund.amount || 0) * ratio;
      }, 0);

      const nextPaymentStatus = resolveOrderPaymentStatus({
        orderAmount: order.paymentAmount || 0,
        settledPaid,
        settledRefunded,
      });

      if (nextPaymentStatus === order.paymentStatus) {
        return;
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: nextPaymentStatus,
        },
      });
    })
  );
}
