import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Valid status transitions based on business logic
const VALID_TRANSITIONS: Record<string, string[]> = {
  'DRAFT': ['PAID', 'CANCELLED'],
  'PAID': ['IN_DESIGN', 'COMPLETED', 'CANCELLED'], // COMPLETED for POS walk-ins
  'IN_DESIGN': ['READY', 'REJECTED', 'CANCELLED'],
  'READY': ['OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'], // COMPLETED for pickup orders
  'OUT_FOR_DELIVERY': ['COMPLETED', 'CANCELLED'],
  'REJECTED': ['IN_DESIGN', 'CANCELLED'],
  'COMPLETED': [], // Final state
  'CANCELLED': []  // Final state
};

/**
 * Update order status with validation
 */
router.patch('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status: newStatus, notes, employeeId } = req.body;

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
    const allowedTransitions = VALID_TRANSITIONS[order.status] || [];
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

    // TODO: Trigger SMS notifications based on new status (Phase 2)
    // await triggerStatusNotification(updatedOrder, newStatus);

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

    let allowedTransitions = VALID_TRANSITIONS[order.status] || [];

    // Filter out OUT_FOR_DELIVERY for pickup orders
    if (order.type === 'PICKUP') {
      allowedTransitions = allowedTransitions.filter(status => status !== 'OUT_FOR_DELIVERY');
    }

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