import express from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { triggerStatusNotifications } from '../../utils/notificationTriggers';

const router = express.Router();
const prisma = new PrismaClient();

// Update order - handles updating both order and underlying database records
router.put('/:id/update', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Store notification trigger data outside transaction scope
    let notificationTrigger: { newStatus: string; previousStatus: string } | null = null;

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // First, get the current order to access related IDs
      const currentOrder = await tx.order.findUnique({
        where: { id },
        include: {
          customer: true,
          recipientCustomer: {
            include: {
              primaryAddress: true,
              addresses: true,
            }
          },
          deliveryAddress: true,
          orderItems: true
        }
      });

      if (!currentOrder) {
        throw new Error('Order not found');
      }

      let orderUpdateData: any = {};

      // Handle customer updates
      if (updateData.customer && currentOrder.customerId) {
        // Update the actual customer record in the database
        await tx.customer.update({
          where: { id: currentOrder.customerId },
          data: {
            firstName: updateData.customer.firstName,
            lastName: updateData.customer.lastName,
            email: updateData.customer.email,
            phone: updateData.customer.phone,
          }
        });
      }

      // Handle customerId reassignment (e.g. fingerprint match linking guest to existing customer)
      if (updateData.customerId) {
        orderUpdateData.customerId = updateData.customerId;
      }

      // Handle recipient updates - Recipients are now managed via Customer API
      // Orders can update their recipientCustomerId and deliveryAddressId references
      if (updateData.recipientCustomerId !== undefined) {
        orderUpdateData.recipientCustomerId = updateData.recipientCustomerId;
      }
      if (updateData.deliveryAddressId !== undefined) {
        orderUpdateData.deliveryAddressId = updateData.deliveryAddressId;
      }
      if (updateData.recipientName !== undefined) {
        orderUpdateData.recipientName = updateData.recipientName || null;
      }

      // Handle inline deliveryAddress updates
      if (updateData.deliveryAddress && typeof updateData.deliveryAddress === 'object') {
        const addressData = updateData.deliveryAddress;
        console.log('📍 Updating deliveryAddress:', addressData);
        console.log('📍 Current order deliveryAddressId:', currentOrder.deliveryAddressId);

        if (currentOrder.deliveryAddressId) {
          try {
            // Update existing address
            const updatedAddress = await tx.address.update({
              where: { id: currentOrder.deliveryAddressId },
              data: {
                firstName: addressData.firstName || '',
                lastName: addressData.lastName || '',
                company: addressData.company || null,
                phone: addressData.phone || '',
                address1: addressData.address1 || '',
                address2: addressData.address2 || null,
                city: addressData.city || '',
                province: addressData.province || '',
                postalCode: addressData.postalCode || '',
                country: addressData.country || 'CA',
                addressType: addressData.addressType || 'RESIDENCE'
              }
            });
            console.log('✅ Address updated successfully:', updatedAddress);
          } catch (error) {
            console.error('❌ Error updating address:', error);
            throw error;
          }
        } else {
          console.log('⚠️ No deliveryAddressId found on order');
        }
      }

      // Handle delivery details updates (both flat and nested under 'delivery' section)
      const deliveryData = updateData.delivery || updateData;

      if (deliveryData.deliveryDate !== undefined) {
        orderUpdateData.deliveryDate = deliveryData.deliveryDate
          ? new Date(deliveryData.deliveryDate + 'T00:00:00')  // Explicitly midnight to avoid timezone shift
          : null;
      }
      if (deliveryData.deliveryTime !== undefined) {
        orderUpdateData.deliveryTime = deliveryData.deliveryTime;
      }
      if (deliveryData.cardMessage !== undefined) {
        orderUpdateData.cardMessage = deliveryData.cardMessage;
      }
      if (deliveryData.specialInstructions !== undefined) {
        orderUpdateData.specialInstructions = deliveryData.specialInstructions;
      }
      if (deliveryData.occasion !== undefined) {
        orderUpdateData.occasion = deliveryData.occasion;
      }
      if (deliveryData.deliveryFee !== undefined) {
        orderUpdateData.deliveryFee = deliveryData.deliveryFee;
      }

      // Handle payment/pricing updates
      // Additional deliveryFee handling for multi-order scenarios
      if (updateData.deliveryFee !== undefined) {
        orderUpdateData.deliveryFee = updateData.deliveryFee;
      }
      if (updateData.discount !== undefined) {
        orderUpdateData.discount = updateData.discount;
      }
      if (updateData.gst !== undefined) {
        orderUpdateData.gst = updateData.gst;
      }
      if (updateData.pst !== undefined) {
        orderUpdateData.pst = updateData.pst;
      }
      if (updateData.totalTax !== undefined) {
        orderUpdateData.totalTax = updateData.totalTax;
      }
      if (updateData.taxBreakdown !== undefined) {
        orderUpdateData.taxBreakdown = updateData.taxBreakdown;
      }

      if (updateData.gst !== undefined || updateData.pst !== undefined) {
        const gst = updateData.gst ?? currentOrder.gst ?? 0;
        const pst = updateData.pst ?? currentOrder.pst ?? 0;
        orderUpdateData.totalTax = gst + pst;
        orderUpdateData.taxBreakdown = [
          ...(gst ? [{ name: 'GST', rate: 0, amount: gst }] : []),
          ...(pst ? [{ name: 'PST', rate: 0, amount: pst }] : [])
        ];
      }

      if (
        updateData.taxBreakdown !== undefined &&
        orderUpdateData.totalTax === undefined &&
        Array.isArray(updateData.taxBreakdown)
      ) {
        orderUpdateData.totalTax = updateData.taxBreakdown.reduce(
          (sum: number, tax: any) => sum + (tax.amount || 0),
          0
        );
      }

      // Handle status updates (with notification triggers)
      if (updateData.status) {
        const previousStatus = currentOrder.status;
        orderUpdateData.status = updateData.status as OrderStatus;

        // Store notification trigger data for after the transaction
        notificationTrigger = {
          newStatus: updateData.status,
          previousStatus: previousStatus
        };
      }

      // Handle order items updates
      if (updateData.orderItems || updateData.recalculateTotal) {
        if (updateData.orderItems) {
    // Delete existing order items
    await tx.orderItem.deleteMany({
      where: { orderId: id }
    });

    // Create new order items with calculated rowTotals
    const newOrderItems = updateData.orderItems.map((item: any) => ({
      orderId: id,
      productId: item.productId || null,
      customName: item.customName,
      description: item.description || null,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      rowTotal: item.unitPrice * item.quantity
    }));

    await tx.orderItem.createMany({
      data: newOrderItems
    });
  }

  // Always recalculate totals when products change
  const currentOrderItems = await tx.orderItem.findMany({
    where: { orderId: id }
  });
  
  const subtotal = currentOrderItems.reduce((sum, item) => sum + item.rowTotal, 0);
  const currentDeliveryFee = orderUpdateData.deliveryFee !== undefined ? orderUpdateData.deliveryFee : currentOrder.deliveryFee;
  const currentDiscount = orderUpdateData.discount !== undefined ? orderUpdateData.discount : currentOrder.discount;
  const currentTotalTax = orderUpdateData.totalTax !== undefined ? orderUpdateData.totalTax : currentOrder.totalTax;

  orderUpdateData.paymentAmount = subtotal + currentDeliveryFee - currentDiscount + currentTotalTax;
}

      const shouldRecalculateTotals =
        !updateData.orderItems &&
        !updateData.recalculateTotal &&
        (orderUpdateData.deliveryFee !== undefined ||
          orderUpdateData.discount !== undefined ||
          orderUpdateData.totalTax !== undefined ||
          orderUpdateData.taxBreakdown !== undefined);

      if (shouldRecalculateTotals) {
        const subtotal = currentOrder.orderItems.reduce((sum, item) => sum + item.rowTotal, 0);
        const currentDeliveryFee =
          orderUpdateData.deliveryFee !== undefined ? orderUpdateData.deliveryFee : currentOrder.deliveryFee;
        const currentDiscount =
          orderUpdateData.discount !== undefined ? orderUpdateData.discount : currentOrder.discount;
        const currentTotalTax =
          orderUpdateData.totalTax !== undefined ? orderUpdateData.totalTax : currentOrder.totalTax;

        orderUpdateData.paymentAmount = subtotal + currentDeliveryFee - currentDiscount + currentTotalTax;
      }

      // Handle images updates
      if (updateData.images !== undefined) {
        orderUpdateData.images = updateData.images;
      }

      // Update the order with any changes
      if (Object.keys(orderUpdateData).length > 0) {
        await tx.order.update({
          where: { id },
          data: orderUpdateData
        });
      }

      // Return the updated order with all relations
      return await tx.order.findUnique({
        where: { id },
        include: {
          customer: true,
          recipientCustomer: {
            include: {
              primaryAddress: true,
              addresses: true,
            }
          },
          deliveryAddress: true,
          orderItems: true,
          employee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    });

    // Respond immediately to user for better UX
    res.json({
      success: true,
      order: result,
      message: 'Order updated successfully'
    });

    // Trigger status notifications in background (non-blocking)
    if (notificationTrigger && result) {
      const { newStatus, previousStatus } = notificationTrigger;
      console.log(`🔔 Triggering notifications for status change: ${previousStatus} → ${newStatus}`);
      
      // Fire-and-forget with proper logging
      triggerStatusNotifications(result, newStatus, previousStatus)
        .then(() => {
          console.log(`✅ Status notifications completed for order #${result.orderNumber}: ${previousStatus} → ${newStatus}`);
        })
        .catch((error) => {
          console.error(`❌ Status notification failed for order #${result.orderNumber}: ${previousStatus} → ${newStatus}`, error);
          // TODO: In production, you might want to:
          // - Save failed notifications to database for retry
          // - Send admin alert email
          // - Log to monitoring service (e.g., Sentry)
        });
    }

  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      error: 'Failed to update order',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete draft order (hard delete)
router.delete('/:id/draft', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (existing.status !== OrderStatus.DRAFT) {
      return res.status(400).json({ error: 'Only draft orders can be deleted' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.orderCommunication.deleteMany({ where: { orderId: id } });
      await tx.orderPayment.deleteMany({ where: { orderId: id } });
      await tx.orderRefund.deleteMany({ where: { orderId: id } });
      await tx.routeStop.deleteMany({ where: { orderId: id } });
      await tx.printJob.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting draft order:', error);
    res.status(500).json({
      error: 'Failed to delete draft order',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
