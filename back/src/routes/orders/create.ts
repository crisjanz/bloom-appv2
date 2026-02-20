import express from 'express';
import { PrismaClient, OrderSource, OrderStatus, PaymentStatus, PrintJobType } from '@prisma/client';
import { calculateTax } from '../../utils/taxCalculator';
import { triggerStatusNotifications } from '../../utils/notificationTriggers';
import { printService } from '../../services/printService';
import { printSettingsService } from '../../services/printSettingsService';
import { buildReceiptPdf } from '../../templates/receipt-pdf';
import { buildThermalReceipt } from '../../templates/receipt-thermal';
import paymentProviderFactory from '../../services/paymentProviders/PaymentProviderFactory';
import { getOrderNumberPrefix } from '../../utils/orderNumberSettings';
import transactionService from '../../services/transactionService';

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

const normalizeAppliedDiscounts = (appliedDiscounts: any[]) => {
  if (!Array.isArray(appliedDiscounts)) return [];
  return appliedDiscounts
    .filter((discount) => discount && (discount.id || discount.discountId))
    .map((discount) => {
      const discountAmount = Number(discount.discountAmount) || 0;
      return {
        id: discount.id || discount.discountId,
        name: discount.name || null,
        code: discount.code || null,
        discountType: discount.discountType || null,
        discountAmountCents: Math.max(0, Math.round(discountAmount * 100)),
      };
    });
};

const resolveDiscountPayload = (orderData: any) => {
  const rawDiscountAmount = Number(orderData.discountAmount) || 0;
  const discountAmountCents = Math.max(0, Math.round(rawDiscountAmount * 100));
  const normalizedDiscounts = normalizeAppliedDiscounts(orderData.appliedDiscounts || []);
  const discountId = normalizedDiscounts.length === 1 ? normalizedDiscounts[0].id : null;
  const discountCode = normalizedDiscounts.length === 1 ? normalizedDiscounts[0].code : null;

  return {
    discountAmountCents,
    discountBreakdown: normalizedDiscounts.map((discount) => ({
      id: discount.id,
      name: discount.name,
      code: discount.code,
      discountType: discount.discountType,
      discountAmount: discount.discountAmountCents,
    })),
    discountId,
    discountCode,
    appliedDiscounts: normalizedDiscounts,
  };
};

const applyDiscountToTaxableAmount = (taxableAmount: number, subtotal: number, discountAmount: number) => {
  if (!subtotal || !discountAmount) return taxableAmount;
  const cappedDiscount = Math.min(discountAmount, subtotal);
  const ratio = cappedDiscount / subtotal;
  const taxableDiscount = Math.round(taxableAmount * ratio);
  return Math.max(0, taxableAmount - taxableDiscount);
};

const recordDiscountUsage = async (
  discounts: { id: string; discountAmountCents: number }[],
  customerId: string | null,
  orderId: string,
  source: string | null,
) => {
  if (!customerId || discounts.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const discount of discounts) {
      await tx.discountUsage.create({
        data: {
          discountId: discount.id,
          customerId,
          orderId,
          source: source || 'UNKNOWN',
          appliedValue: discount.discountAmountCents,
        },
      });

      await tx.discount.update({
        where: { id: discount.id },
        data: {
          usageCount: { increment: 1 },
        },
      });
    }
  });
};

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

    const orderNumberPrefix = await getOrderNumberPrefix(prisma);

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

      const {
        discountAmountCents,
        discountBreakdown,
        discountId,
        discountCode,
        appliedDiscounts,
      } = resolveDiscountPayload(orderData);

      const discountedSubtotal = Math.max(subtotal - discountAmountCents, 0);
      const taxableAmountAfterDiscount = applyDiscountToTaxableAmount(
        taxableAmount,
        subtotal,
        discountAmountCents,
      );
      
      const taxCalculation = await calculateTax(taxableAmountAfterDiscount);

      const deliveryFeeInCents = Math.round(orderData.deliveryFee * 100);
      const totalAmount = discountedSubtotal + taxCalculation.totalAmount + deliveryFeeInCents;

      // Create order with DRAFT status first, will be updated to PAID by PT transaction
      const order = await prisma.order.create({
        data: {
          type: orderData.orderType,
          status: OrderStatus.DRAFT, // Start as DRAFT, PT transaction will update to PAID
          paymentStatus: PaymentStatus.UNPAID,
          orderSource: orderData.orderSource || 'PHONE', // Default to PHONE if not provided
          customerId,
          recipientCustomerId,
          deliveryAddressId,
          cardMessage: orderData.cardMessage || null,
          occasion: orderData.occasion || null,
          specialInstructions: orderData.deliveryInstructions || null,
          deliveryDate: orderData.deliveryDate
            ? new Date(orderData.deliveryDate + 'T00:00:00')  // Explicitly midnight to avoid timezone shift
            : null,
          deliveryTime: orderData.deliveryTime || null,
          deliveryFee: deliveryFeeInCents,
          discount: discountAmountCents,
          discountBreakdown,
          discountId,
          discountCode,
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
              primaryAddress: true,
              addresses: true,
            }
          },
          deliveryAddress: true,
          customer: true
        }
      });

      console.log('Order created:', order.id);
      createdOrders.push(order);

      await recordDiscountUsage(
        appliedDiscounts,
        customerId,
        order.id,
        orderData.orderSource || 'POS',
      );
    }

    // Update all orders to PAID status and trigger notifications
    for (const order of createdOrders) {
      try {
        // Update order status to PAID
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            paymentStatus: PaymentStatus.PAID,
            updatedAt: new Date()
          },
          include: {
            customer: true,
            recipientCustomer: {
              include: {
                primaryAddress: true,
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
              priority: 10,
              orderNumberPrefix,
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
              const pdfBuffer = await buildReceiptPdf(orderWithTransactions, orderNumberPrefix);
              jobOrder = { ...orderWithTransactions, pdfBase64: pdfBuffer.toString('base64') };
            }

            if (config.destination === 'receipt-agent') {
              const thermalBuffer = await buildThermalReceipt(orderWithTransactions, orderNumberPrefix);
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
    const orderNumberPrefix = await getOrderNumberPrefix(prisma);
    const websitePaymentGroups = new Map<
      string,
      { orderIds: string[]; totalAmount: number; taxAmount: number }
    >();

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

      const {
        discountAmountCents,
        discountBreakdown,
        discountId,
        discountCode,
        appliedDiscounts,
      } = resolveDiscountPayload(orderData);

      const discountedSubtotal = Math.max(subtotal - discountAmountCents, 0);
      const taxableAmountAfterDiscount = applyDiscountToTaxableAmount(
        taxableAmountDraft,
        subtotal,
        discountAmountCents,
      );
      
      const taxCalculationDraft = await calculateTax(taxableAmountAfterDiscount);

      const paymentIntentId =
        typeof orderData.paymentIntentId === 'string' ? orderData.paymentIntentId : null;
      const paymentIntentStatus =
        typeof orderData.paymentStatus === 'string' ? orderData.paymentStatus : null;
      const hasConfirmedPayment = Boolean(
        paymentIntentId && (!paymentIntentStatus || paymentIntentStatus === 'succeeded')
      );
      const rawOrderSource =
        typeof orderData.orderSource === 'string' ? orderData.orderSource.toUpperCase() : null;
      const normalizedOrderSource = rawOrderSource && Object.values(OrderSource).includes(rawOrderSource as OrderSource)
        ? (rawOrderSource as OrderSource)
        : null;
      const resolvedOrderSource = normalizedOrderSource || (hasConfirmedPayment ? OrderSource.WEBSITE : null);

      const deliveryFeeInCents = Math.round(orderData.deliveryFee * 100);
      const totalAmount = discountedSubtotal + taxCalculationDraft.totalAmount + deliveryFeeInCents;

      const order = await prisma.order.create({
        data: {
          type: orderData.orderType,
          status: hasConfirmedPayment ? OrderStatus.PAID : OrderStatus.DRAFT,
          paymentStatus: hasConfirmedPayment ? PaymentStatus.PAID : PaymentStatus.UNPAID,
          ...(resolvedOrderSource ? { orderSource: resolvedOrderSource } : {}),
          customerId,
          recipientCustomerId,
          deliveryAddressId,
          cardMessage: orderData.cardMessage || null,
          occasion: orderData.occasion || null,
          specialInstructions: orderData.deliveryInstructions || null,
          deliveryDate: orderData.deliveryDate
            ? new Date(orderData.deliveryDate + 'T00:00:00')  // Explicitly midnight to avoid timezone shift
            : null,
          deliveryTime: orderData.deliveryTime || null,
          deliveryFee: deliveryFeeInCents,
          discount: discountAmountCents,
          discountBreakdown,
          discountId,
          discountCode,
          taxBreakdown: taxCalculationDraft.breakdown, // Dynamic tax breakdown
          totalTax: taxCalculationDraft.totalAmount, // Total tax amount
          paymentAmount: hasConfirmedPayment ? totalAmount : 0,
          images: [], // Initialize empty images array
          orderItems: {
            create: orderItems
          }
        },
        include: {
          orderItems: true,
          recipientCustomer: {
            include: {
              primaryAddress: true,
              addresses: true,
            }
          },
          deliveryAddress: true,
          customer: true
        }
      });

      draftOrders.push(order);

      if (hasConfirmedPayment && paymentIntentId) {
        const group = websitePaymentGroups.get(paymentIntentId) || {
          orderIds: [],
          totalAmount: 0,
          taxAmount: 0,
        };
        group.orderIds.push(order.id);
        group.totalAmount += totalAmount;
        group.taxAmount += taxCalculationDraft.totalAmount;
        websitePaymentGroups.set(paymentIntentId, group);
      }

      if (hasConfirmedPayment) {
        await recordDiscountUsage(
          appliedDiscounts,
          customerId,
          order.id,
          resolvedOrderSource,
        );

        // Match POS behavior: fire configured PAID notifications for successful website checkouts.
        triggerStatusNotifications(order, 'PAID', 'DRAFT')
          .then(() => {
            console.log(
              `✅ Website order confirmation notifications sent for order #${order.orderNumber}`
            );
          })
          .catch((notifyError) => {
            console.error(
              `❌ Website order confirmation notification failed for order #${order.orderNumber}:`,
              notifyError
            );
          });

        if (order.type === 'DELIVERY' || order.type === 'PICKUP') {
          try {
            await printService.queuePrintJob({
              type: PrintJobType.ORDER_TICKET,
              orderId: order.id,
              order: order as any,
              template: 'delivery-ticket-v1',
              priority: 10,
              orderNumberPrefix,
            });
            console.log(
              `✅ Queued website ${String(order.type).toLowerCase()} ticket print job for order #${order.orderNumber}`
            );
          } catch (printError) {
            console.error(
              `❌ Failed to queue website ${String(order.type).toLowerCase()} ticket for order #${order.orderNumber}:`,
              printError
            );
          }
        }
      }

      if (hasConfirmedPayment && paymentIntentId && order.orderNumber) {
        (async () => {
          try {
            const stripe = await paymentProviderFactory.getStripeClient();
            await stripe.paymentIntents.update(paymentIntentId, {
              description: `Web Order - ${order.orderNumber}`,
            });
          } catch (err) {
            console.error('Failed to update Stripe PaymentIntent description:', err);
          }
        })();
      }
    }

    if (websitePaymentGroups.size > 0) {
      for (const [paymentIntentId, group] of websitePaymentGroups.entries()) {
        try {
          await transactionService.createTransaction({
            customerId,
            channel: 'WEBSITE',
            totalAmount: group.totalAmount,
            taxAmount: group.taxAmount,
            tipAmount: 0,
            notes: `Website checkout ${paymentIntentId}`,
            paymentMethods: [
              {
                type: 'CARD',
                provider: 'STRIPE',
                amount: group.totalAmount,
                providerTransactionId: paymentIntentId,
                providerMetadata: {
                  source: 'WEBSITE_CHECKOUT',
                },
              },
            ],
            orderIds: group.orderIds,
          });

          console.log(
            `✅ Created website payment transaction for ${paymentIntentId} (${group.orderIds.length} order(s))`
          );
        } catch (ptError) {
          console.error(
            `⚠️ Failed to create website payment transaction for ${paymentIntentId}:`,
            ptError
          );
        }
      }
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
