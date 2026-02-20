import { Router } from 'express';
import type Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { triggerStatusNotifications } from '../../utils/notificationTriggers';
import refundService from '../../services/refundService';
import paymentProviderFactory from '../../services/paymentProviders/PaymentProviderFactory';
import squareService from '../../services/squareService';

const router = Router();
const prisma = new PrismaClient();

/**
 * Process refunds for all payment transactions linked to an order
 */
async function processOrderRefunds(orderId: string, employeeId?: string) {
  console.log(`💸 Processing refunds for cancelled order: ${orderId}`);

  // Get all payment transactions for this order
  const orderPayments = await prisma.orderPayment.findMany({
    where: { orderId },
    include: {
      transaction: {
        include: {
          paymentMethods: true,
          refunds: {
            include: {
              orderRefunds: true
            }
          }
        }
      }
    }
  });

  if (orderPayments.length === 0) {
    console.log(`ℹ️ No payment transactions found for order ${orderId}`);
    return;
  }

  // Process refund for each transaction
  for (const orderPayment of orderPayments) {
    const transaction = orderPayment.transaction;

    const orderRefunded = transaction.refunds
      .flatMap((refund) => refund.orderRefunds)
      .filter((orderRefund) => orderRefund.orderId === orderId)
      .reduce((sum, orderRefund) => sum + orderRefund.amount, 0);

    const refundAmount = orderPayment.amount - orderRefunded;
    if (refundAmount <= 0) {
      console.log(`⏭️ Order ${orderId} already fully refunded for transaction ${transaction.transactionNumber}`);
      continue;
    }

    console.log(`💰 Refunding ${transaction.transactionNumber} for order ${orderId}: $${(refundAmount / 100).toFixed(2)}`);

    // Build refund methods matching original payment methods
    const refundMethods = [];
    const methodAllocations = [];
    const allocationBase = transaction.totalAmount || 0;
    let allocatedTotal = 0;

    for (const paymentMethod of transaction.paymentMethods) {
      const ratio = allocationBase > 0 ? refundAmount / allocationBase : 0;
      const methodRefundAmount = Math.round(paymentMethod.amount * ratio);
      methodAllocations.push({
        paymentMethod,
        amount: methodRefundAmount
      });
      allocatedTotal += methodRefundAmount;
    }

    if (methodAllocations.length > 0 && allocatedTotal !== refundAmount) {
      const adjustment = refundAmount - allocatedTotal;
      methodAllocations[methodAllocations.length - 1].amount += adjustment;
    }

    const positiveAllocations = methodAllocations.filter((allocation) => allocation.amount > 0);

    for (const allocation of positiveAllocations) {
      const paymentMethod = allocation.paymentMethod;
      const methodRefundAmount = allocation.amount;

      // For CARD payments via Stripe or Square, process actual refund
      if (paymentMethod.type === 'CARD' && paymentMethod.providerTransactionId) {
        try {
          let providerRefundId: string | undefined;

          if (paymentMethod.provider === 'STRIPE') {
            console.log(`🔵 Processing Stripe refund for payment: ${paymentMethod.providerTransactionId}`);
            const stripe = await paymentProviderFactory.getStripeClient();
            const refundData: Stripe.RefundCreateParams = {
              payment_intent: paymentMethod.providerTransactionId,
              reason: 'Order cancelled' as Stripe.RefundCreateParams.Reason,
            };

            if (methodRefundAmount) {
              refundData.amount = methodRefundAmount;
            }

            const stripeRefund = await stripe.refunds.create(refundData);
            providerRefundId = stripeRefund.id;
            console.log(`✅ Stripe refund created: ${providerRefundId}`);
          } else if (paymentMethod.provider === 'SQUARE') {
            console.log(`🟦 Processing Square refund for payment: ${paymentMethod.providerTransactionId}`);
            const squareRefund = await squareService.createRefund(
              paymentMethod.providerTransactionId,
              methodRefundAmount / 100, // Convert cents to dollars
              'Order cancelled'
            );
            providerRefundId = squareRefund.id;
            console.log(`✅ Square refund created: ${providerRefundId}`);
          }

          refundMethods.push({
            paymentMethodType: paymentMethod.type,
            provider: paymentMethod.provider,
            amount: methodRefundAmount,
            providerRefundId,
            status: 'completed'
          });
        } catch (error) {
          console.error(`❌ Failed to process ${paymentMethod.provider} refund:`, error);
          // Still record the refund in database for manual processing
          refundMethods.push({
            paymentMethodType: paymentMethod.type,
            provider: paymentMethod.provider,
            amount: methodRefundAmount,
            status: 'failed'
          });
        }
      } else {
        // For non-card payments (CASH, GIFT_CARD, etc.), just record in database
        console.log(`📝 Recording ${paymentMethod.type} refund (manual processing required)`);
        refundMethods.push({
          paymentMethodType: paymentMethod.type,
          provider: paymentMethod.provider,
          amount: methodRefundAmount,
          status: 'manual'
        });
      }
    }

    // Create refund record in database
    if (refundMethods.length > 0) {
      try {
        await refundService.processRefund({
          transactionId: transaction.id,
          refundType: refundAmount >= orderPayment.amount ? 'FULL' : 'PARTIAL',
          totalAmount: refundAmount,
          reason: 'Order cancelled',
          employeeId,
          orderRefunds: [{ orderId, amount: refundAmount }],
          refundMethods: refundMethods as any
        });
        console.log(`✅ Refund record created for ${transaction.transactionNumber}`);
      } catch (error) {
        console.error(`❌ Failed to create refund record for ${transaction.transactionNumber}:`, error);
      }
    }
  }
}

const ALL_BACKEND_STATUSES = [
  'DRAFT',
  'PAID',
  'IN_DESIGN',
  'READY',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'REJECTED',
  'CANCELLED'
] as const;

const getAllowedTransitions = (currentStatus: string, orderType?: string | null): string[] => {
  // Keep initial workflow constrained.
  if (currentStatus === 'DRAFT') {
    return ['PAID', 'CANCELLED'];
  }

  // Cancelled orders are locked terminal statuses.
  if (currentStatus === 'CANCELLED') {
    return [];
  }

  let transitions = ALL_BACKEND_STATUSES.filter(
    (status) => status !== currentStatus && status !== 'DRAFT'
  );

  // Pickup orders should never move to out-for-delivery.
  if (orderType === 'PICKUP') {
    transitions = transitions.filter((status) => status !== 'OUT_FOR_DELIVERY');
  }

  return transitions;
};

/**
 * Update order status with validation
 */
router.patch('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status: newStatus, notes, employeeId, skipRefund } = req.body;

    if (!newStatus) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    // Get current order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true,
        status: true,
        type: true,
        orderNumber: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Validate status transition
    const allowedTransitions = getAllowedTransitions(order.status, order.type);
    if (!allowedTransitions.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status transition from ${order.status} to ${newStatus}`,
        allowedTransitions
      });
    }

    // Special validation for pickup orders - skip OUT_FOR_DELIVERY
    if (order.type === 'PICKUP' && newStatus === 'OUT_FOR_DELIVERY') {
      return res.status(400).json({
        success: false,
        error: 'Pickup orders cannot be set to OUT_FOR_DELIVERY'
      });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: newStatus,
        updatedAt: new Date()
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      }
    });

    console.log(`📋 Order #${order.orderNumber} status updated: ${order.status} → ${newStatus}`);

    // Process refunds if order was cancelled (unless skipRefund=true, which means refund was handled separately)
    if (newStatus === 'CANCELLED' && !skipRefund) {
      try {
        await processOrderRefunds(orderId, employeeId);
      } catch (error) {
        console.error('❌ Error processing refunds for cancelled order:', error);
        // Don't fail the status update if refunds fail - they can be processed manually
      }
    }

    // Trigger status notifications based on settings
    await triggerStatusNotifications(updatedOrder, newStatus, order.status);

    res.json({
      success: true,
      message: `Order status updated to ${newStatus}`,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        type: updatedOrder.type,
        customer: updatedOrder.customer
      },
      previousStatus: order.status
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
});

/**
 * Get valid next statuses for an order
 */
router.get('/:orderId/next-statuses', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, type: true }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const allowedTransitions = getAllowedTransitions(order.status, order.type);

    res.json({
      success: true,
      currentStatus: order.status,
      orderType: order.type,
      nextStatuses: allowedTransitions
    });

  } catch (error) {
    console.error('Error getting next statuses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get next statuses'
    });
  }
});

/**
 * Get order status history (placeholder for future implementation)
 */
router.get('/:orderId/history', async (req, res) => {
  try {
    const { orderId } = req.params;

    // TODO: Implement status history tracking
    // For now, just return current status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        status: true, 
        createdAt: true, 
        updatedAt: true,
        orderNumber: true
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      history: [
        {
          status: 'DRAFT',
          timestamp: order.createdAt,
          note: 'Order created'
        },
        {
          status: order.status,
          timestamp: order.updatedAt,
          note: 'Current status'
        }
      ]
    });

  } catch (error) {
    console.error('Error getting order history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order history'
    });
  }
});

export default router;
