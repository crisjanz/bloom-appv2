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
          recipient: true
        }
      });

      if (!currentOrder) {
        throw new Error('Order not found');
      }

      let orderUpdateData: any = {};

      // Handle customer updates
      if (updateData.customer) {
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

      // Handle recipient/address updates
      if (updateData.recipient) {
        if (currentOrder.recipientId && updateData.updateDatabase) {
          // Update the existing address record
          await tx.address.update({
              where: { id: currentOrder.recipientId },
              data: {
                firstName: updateData.recipient.firstName,
                lastName: updateData.recipient.lastName,
                company: updateData.recipient.company || '',
                phone: updateData.recipient.phone,
                address1: updateData.recipient.address1,
                address2: updateData.recipient.address2 || '',
                city: updateData.recipient.city,
                province: updateData.recipient.province,
                postalCode: updateData.recipient.postalCode,
                country: updateData.recipient.country || 'CA',
              }
            });

            // Also update the customer's address database
            // This ensures the customer's recipient list is kept in sync
            if (updateData.recipient.customerId) {
              // The address is already linked to the customer via customerId
              // So the update above already updated the customer's address database
              // But we can also update the customer's main contact info if this matches their home address
              const customer = await tx.customer.findUnique({
                where: { id: updateData.recipient.customerId },
                include: { homeAddress: true }
              });

              // If this address is the customer's home address, update their main contact info too
              if (customer?.homeAddressId === currentOrder.recipientId) {
                await tx.customer.update({
                  where: { id: updateData.recipient.customerId },
                  data: {
                    firstName: updateData.recipient.firstName,
                    lastName: updateData.recipient.lastName,
                    phone: updateData.recipient.phone,
                  }
                });
              }
            }
        } else if (!currentOrder.recipientId) {
          // Create new address if none exists
          const newAddress = await tx.address.create({
            data: {
              firstName: updateData.recipient.firstName,
              lastName: updateData.recipient.lastName,
              company: updateData.recipient.company || '',
              phone: updateData.recipient.phone,
              address1: updateData.recipient.address1,
              address2: updateData.recipient.address2 || '',
              city: updateData.recipient.city,
              province: updateData.recipient.province,
              postalCode: updateData.recipient.postalCode,
              country: updateData.recipient.country || 'CA',
              customerId: currentOrder.customerId, // Link to customer
            }
          });
          orderUpdateData.recipientId = newAddress.id;
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
      customName: item.customName,
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
          recipient: true,
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

export default router;