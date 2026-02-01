import express from 'express';
import { PrismaClient, OrderStatus, PrintJobType } from '@prisma/client';
import { calculateTax } from '../../utils/taxCalculator';
import { triggerStatusNotifications } from '../../utils/notificationTriggers';
import { printService } from '../../services/printService';
import { printSettingsService } from '../../services/printSettingsService';
import { buildReceiptPdf } from '../../templates/receipt-pdf';
import { buildThermalReceipt } from '../../templates/receipt-thermal';

const router = express.Router();
const prisma = new PrismaClient();

function getOrderTransactions(order: any) {
  const transactions = order.orderPayments?.map((op: any) => op.transaction).filter(Boolean) || [];

  // Sort: completed first, then failed/cancelled, then others
  return transactions.sort((a: any, b: any) => {
    const priority = { COMPLETED: 0, FAILED: 1, CANCELLED: 2, PROCESSING: 3, PENDING: 4 };
    return (priority[a.status] ?? 99) - (priority[b.status] ?? 99);
  });
}

// Create orders after payment confirmation
router.post('/create', async (req, res) => {
  try {
    const { customerId, orders, paymentConfirmed } = req.body;

    console.log('Order creation request:', { customerId, orderCount: orders?.length, paymentConfirmed });

    if (!customerId || !orders || !Array.isArray(orders)) {
      return res.status(400).json({ 
        error: 'customerId and orders array are required' 
      });
    }

    if (!paymentConfirmed) {
      return res.status(400).json({ 
        error: 'Payment must be confirmed before creating orders' 
      });
    }

    const orderWithBirthday = orders.find((order: any) => order.birthdayOptIn !== undefined);
    if (orderWithBirthday && orderWithBirthday.birthdayOptIn) {
      if (!orderWithBirthday.birthdayMonth || !orderWithBirthday.birthdayDay) {
        return res.status(400).json({ error: 'Birthday month and day are required when opting in' });
      }

      await prisma.customer.update({
        where: { id: customerId },
        data: {
          birthdayOptIn: true,
          birthdayMonth: orderWithBirthday.birthdayMonth,
          birthdayDay: orderWithBirthday.birthdayDay,
          birthdayYear: orderWithBirthday.birthdayYear ?? null,
          birthdayUpdatedAt: new Date(),
        }
      });
    }

    const createdOrders = [];
    const printActions: Array<Record<string, any>> = [];

    for (const orderData of orders) {
      console.log('Creating order for:', orderData.orderType);

      // NEW: Use Customer-based recipient system (recipientCustomerId + deliveryAddressId)
      let recipientCustomerId = orderData.recipientCustomerId || null;
      let deliveryAddressId = orderData.deliveryAddressId || null;

      if (orderData.orderType === 'DELIVERY' && !recipientCustomerId) {
        console.warn('⚠️ Delivery order created without recipient - recipient should be managed via customer API');
      }

      // Calculate totals
      let subtotal = 0;
      const orderItems = orderData.customProducts.map((product: any) => {
        const unitPrice = Math.round(parseFloat(product.price) * 100);
        const quantity = parseInt(product.qty);
        const rowTotal = unitPrice * quantity;
        subtotal += rowTotal;
        
        return {
          customName: product.description,
          description: product.description,
          unitPrice,
          quantity,
          rowTotal
        };
      });

      // Calculate taxes using centralized tax rates
      const taxableAmount = orderItems
        .filter((_: any, index: number) => orderData.customProducts[index].tax)
        .reduce((sum: number, item: any) => sum + item.rowTotal, 0);
      
      const taxCalculation = await calculateTax(taxableAmount);

      const deliveryFeeInCents = Math.round(orderData.deliveryFee * 100);
      const totalAmount = subtotal + taxCalculation.totalAmount + deliveryFeeInCents;

      // Create order with DRAFT status first, will be updated to PAID by PT transaction
      const order = await prisma.order.create({
        data: {
          type: orderData.orderType,
          status: OrderStatus.DRAFT, // Start as DRAFT, PT transaction will update to PAID
          orderSource: orderData.orderSource || 'PHONE', // Default to PHONE if not provided
          customerId,
          recipientCustomerId,
          deliveryAddressId,
          cardMessage: orderData.cardMessage || null,
          specialInstructions: orderData.deliveryInstructions || null,
          deliveryDate: orderData.deliveryDate
            ? new Date(orderData.deliveryDate + 'T00:00:00')  // Explicitly midnight to avoid timezone shift
            : null,
          deliveryTime: orderData.deliveryTime || null,
          deliveryFee: deliveryFeeInCents,
          taxBreakdown: taxCalculation.breakdown, // Dynamic tax breakdown
          totalTax: taxCalculation.totalAmount, // Total tax amount
          paymentAmount: totalAmount,
          images: [], // Initialize empty images array
          orderItems: {
            create: orderItems
          }
        },
        include: {
          orderItems: true,
          recipientCustomer: {
            include: {
              homeAddress: true,
              addresses: true,
            }
          },
          deliveryAddress: true,
          customer: true
        }
      });

      console.log('Order created:', order.id);
      createdOrders.push(order);
    }

    // Update all orders to PAID status and trigger notifications
    for (const order of createdOrders) {
      try {
        // Update order status to PAID
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            updatedAt: new Date()
          },
          include: {
            customer: true,
            recipientCustomer: {
              include: {
                homeAddress: true,
                addresses: true,
              }
            },
            deliveryAddress: true,
            orderItems: {
              include: {
                product: true
              }
            },
            orderPayments: {
              include: {
                transaction: {
                  include: {
                    paymentMethods: true,
                  },
                },
              },
            },
          }
        });

        console.log(`📋 Order #${order.orderNumber} status updated: DRAFT → PAID`);

        // Trigger status notifications in background (non-blocking)
        triggerStatusNotifications(updatedOrder, 'PAID', 'DRAFT')
          .then(() => {
            console.log(`✅ Order confirmation notifications sent for order #${updatedOrder.orderNumber}`);
          })
          .catch((error) => {
            console.error(`❌ Order confirmation notification failed for order #${updatedOrder.orderNumber}:`, error);
            // TODO: Log to monitoring service for production
          });

        if (updatedOrder.type === 'DELIVERY') {
          try {
            const result = await printService.queuePrintJob({
              type: PrintJobType.ORDER_TICKET,
              orderId: updatedOrder.id,
              order: updatedOrder as any,
              template: 'delivery-ticket-v1',
              priority: 10
            });
            printActions.push({ orderId: updatedOrder.id, orderNumber: updatedOrder.orderNumber, ...result });
          } catch (error) {
            console.error(`❌ Failed to queue delivery print job for order #${updatedOrder.orderNumber}:`, error);
          }
        }

        if (updatedOrder.orderSource === 'POS' || updatedOrder.orderSource === 'WALKIN') {
          try {
            const config = await printSettingsService.getConfigForType(PrintJobType.RECEIPT);
            const orderWithTransactions = {
              ...updatedOrder,
              transactions: getOrderTransactions(updatedOrder),
            };
            let jobOrder: any = orderWithTransactions;
            let template = 'receipt-pdf-v1';

            if (config.destination === 'electron-agent') {
              const pdfBuffer = await buildReceiptPdf(orderWithTransactions);
              jobOrder = { ...orderWithTransactions, pdfBase64: pdfBuffer.toString('base64') };
            }

            if (config.destination === 'receipt-agent') {
              const thermalBuffer = await buildThermalReceipt(orderWithTransactions);
              jobOrder = { ...orderWithTransactions, thermalCommands: thermalBuffer.toString('base64') };
              template = 'receipt-thermal-v1';
            }

            const result = await printService.queuePrintJob({
              type: PrintJobType.RECEIPT,
              orderId: updatedOrder.id,
              order: jobOrder,
              template,
              priority: 10
            });
            printActions.push({ orderId: updatedOrder.id, orderNumber: updatedOrder.orderNumber, ...result });
          } catch (error) {
            console.error(`❌ Failed to queue receipt print job for order #${updatedOrder.orderNumber}:`, error);
          }
        }

      } catch (error) {
        console.error(`❌ Failed to update order ${order.id} to PAID:`, error);
        // Continue with other orders even if one fails
      }
    }

    console.log(`Successfully created ${createdOrders.length} orders`);

    // Respond immediately - notifications are sent in background
    res.json({ 
      success: true, 
      orders: createdOrders,
      totalAmount: createdOrders.reduce((sum, order) => sum + order.paymentAmount, 0),
      printActions
    });

  } catch (error) {
    console.error('Error creating orders:', error);
    res.status(500).json({ 
      error: 'Failed to create orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save orders as draft
router.post('/save-draft', async (req, res) => {
  try {
    const { customerId, orders } = req.body;

    console.log('Draft order creation request:', { customerId, orderCount: orders?.length });

    if (!customerId || !orders || !Array.isArray(orders)) {
      return res.status(400).json({ 
        error: 'customerId and orders array are required' 
      });
    }

    const orderWithBirthday = orders.find((order: any) => order.birthdayOptIn !== undefined);

    if (orderWithBirthday && orderWithBirthday.birthdayOptIn) {
      if (!orderWithBirthday.birthdayMonth || !orderWithBirthday.birthdayDay) {
        return res.status(400).json({ error: 'Birthday month and day are required when opting in' });
      }

      await prisma.customer.update({
        where: { id: customerId },
        data: {
          birthdayOptIn: true,
          birthdayMonth: orderWithBirthday.birthdayMonth,
          birthdayDay: orderWithBirthday.birthdayDay,
          birthdayYear: orderWithBirthday.birthdayYear ?? null,
          birthdayUpdatedAt: new Date(),
        }
      });
    }

    const draftOrders = [];

    for (const orderData of orders) {
      // NEW: Use Customer-based recipient system (recipientCustomerId + deliveryAddressId)
      let recipientCustomerId = orderData.recipientCustomerId || null;
      let deliveryAddressId = orderData.deliveryAddressId || null;

      console.log('📦 Processing order:', {
        orderType: orderData.orderType,
        providedRecipientCustomerId: orderData.recipientCustomerId,
        providedDeliveryAddressId: orderData.deliveryAddressId,
        finalRecipientCustomerId: recipientCustomerId,
        finalDeliveryAddressId: deliveryAddressId
      });

      if (orderData.orderType === 'DELIVERY' && !recipientCustomerId) {
        console.warn('⚠️ Delivery order draft created without recipient - recipient should be managed via customer API');
      }

      // Calculate totals (same as above)
      let subtotal = 0;
      const orderItems = orderData.customProducts.map((product: any) => {
        const unitPrice = Math.round(parseFloat(product.price) * 100);
        const quantity = parseInt(product.qty);
        const rowTotal = unitPrice * quantity;
        subtotal += rowTotal;
        
        return {
          customName: product.description,
          description: product.description,
          unitPrice,
          quantity,
          rowTotal
        };
      });

      // Calculate taxes using centralized tax rates for draft
      const taxableAmountDraft = orderItems
        .filter((_: any, index: number) => orderData.customProducts[index].tax)
        .reduce((sum: number, item: any) => sum + item.rowTotal, 0);
      
      const taxCalculationDraft = await calculateTax(taxableAmountDraft);

      const order = await prisma.order.create({
        data: {
          type: orderData.orderType,
          status: OrderStatus.DRAFT,
          customerId,
          recipientCustomerId,
          deliveryAddressId,
          cardMessage: orderData.cardMessage || null,
          specialInstructions: orderData.deliveryInstructions || null,
          deliveryDate: orderData.deliveryDate
            ? new Date(orderData.deliveryDate + 'T00:00:00')  // Explicitly midnight to avoid timezone shift
            : null,
          deliveryTime: orderData.deliveryTime || null,
          deliveryFee: Math.round(orderData.deliveryFee * 100),
          taxBreakdown: taxCalculationDraft.breakdown, // Dynamic tax breakdown
          totalTax: taxCalculationDraft.totalAmount, // Total tax amount
          paymentAmount: 0, // No payment for drafts
          images: [], // Initialize empty images array
          orderItems: {
            create: orderItems
          }
        },
        include: {
          orderItems: true,
          recipientCustomer: {
            include: {
              homeAddress: true,
              addresses: true,
            }
          },
          deliveryAddress: true,
          customer: true
        }
      });

      draftOrders.push(order);
    }

    console.log(`Successfully created ${draftOrders.length} draft orders`);

    res.json({ 
      success: true, 
      drafts: draftOrders 
    });

  } catch (error) {
    console.error('Error saving drafts:', error);
    res.status(500).json({ 
      error: 'Failed to save drafts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
