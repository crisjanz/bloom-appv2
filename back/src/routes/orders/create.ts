import express from 'express';
import { OrderActivityType, Prisma, PrismaClient, OrderSource, OrderStatus, PaymentStatus, PrintJobType } from '@prisma/client';
import { calculateTax } from '../../utils/taxCalculator';
import { triggerStatusNotifications } from '../../utils/notificationTriggers';
import { printService } from '../../services/printService';
import { printSettingsService } from '../../services/printSettingsService';
import { buildReceiptPdf } from '../../templates/receipt-pdf';
import { buildThermalReceipt } from '../../templates/receipt-thermal';
import paymentProviderFactory from '../../services/paymentProviders/PaymentProviderFactory';
import { getOrderNumberPrefix } from '../../utils/orderNumberSettings';
import transactionService from '../../services/transactionService';
import { logOrderActivity } from '../../services/orderActivityService';

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
  tx?: Prisma.TransactionClient,
) => {
  if (!customerId || discounts.length === 0) return;

  const recordWithTx = async (activeTx: Prisma.TransactionClient) => {
    for (const discount of discounts) {
      await activeTx.discountUsage.create({
        data: {
          discountId: discount.id,
          customerId,
          orderId,
          source: source || 'UNKNOWN',
          appliedValue: discount.discountAmountCents,
        },
      });

      await activeTx.discount.update({
        where: { id: discount.id },
        data: {
          usageCount: { increment: 1 },
        },
      });
    }
  };

  if (tx) {
    await recordWithTx(tx);
    return;
  }

  await prisma.$transaction(async (innerTx) => {
    await recordWithTx(innerTx);
  });
};

const orderIncludeForResponse = {
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
};
const IDEMPOTENCY_REPLAY_MARKER = '__IDEMPOTENCY_REPLAY__';

const getExistingTransactionReplay = async (idempotencyKey: string) => {
  const existingTransaction = await prisma.paymentTransaction.findUnique({
    where: { idempotencyKey },
    include: {
      customer: true,
      employee: true,
      paymentMethods: true,
      orderPayments: {
        include: {
          order: {
            include: orderIncludeForResponse,
          },
        },
      },
    },
  });

  if (!existingTransaction) {
    return null;
  }

  const seen = new Set<string>();
  const existingOrders = existingTransaction.orderPayments
    .map((op) => op.order)
    .filter((order): order is NonNullable<typeof order> => Boolean(order))
    .filter((order) => {
      if (seen.has(order.id)) return false;
      seen.add(order.id);
      return true;
    });

  return {
    transaction: existingTransaction,
    orders: existingOrders,
  };
};

// Create orders after payment confirmation
router.post('/create', async (req, res) => {
  try {
    const { customerId, orders, paymentConfirmed, paymentTransaction, idempotencyKey } = req.body;

    console.log('Order creation request:', {
      customerId,
      orderCount: orders?.length,
      paymentConfirmed,
      hasPaymentTransaction: Boolean(paymentTransaction),
      idempotencyKey,
    });

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

    const paymentMethods = Array.isArray(paymentTransaction?.paymentMethods)
      ? paymentTransaction.paymentMethods
      : [];
    if (paymentMethods.length === 0) {
      return res.status(400).json({
        error: 'paymentTransaction.paymentMethods is required for atomic order creation'
      });
    }

    const normalizedIdempotencyKey =
      typeof idempotencyKey === 'string' && idempotencyKey.trim().length > 0
        ? idempotencyKey.trim()
        : undefined;

    if (normalizedIdempotencyKey) {
      const replay = await getExistingTransactionReplay(normalizedIdempotencyKey);
      if (replay) {
        return res.json({
          success: true,
          replayed: true,
          orders: replay.orders,
          totalAmount: replay.orders.reduce((sum, order) => sum + (order.paymentAmount || 0), 0),
          paymentTransaction: replay.transaction,
          printActions: [],
        });
      }
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

    const requestOrderSourceRaw =
      typeof req.body.orderSource === 'string' ? req.body.orderSource.toUpperCase() : null;
    const requestOrderSource =
      requestOrderSourceRaw && Object.values(OrderSource).includes(requestOrderSourceRaw as OrderSource)
        ? (requestOrderSourceRaw as OrderSource)
        : null;

    const requestedChannelRaw =
      typeof paymentTransaction?.channel === 'string' ? paymentTransaction.channel.toUpperCase() : null;
    const channel: 'POS' | 'PHONE' | 'WEBSITE' =
      requestedChannelRaw === 'POS' || requestedChannelRaw === 'PHONE' || requestedChannelRaw === 'WEBSITE'
        ? requestedChannelRaw
        : 'PHONE';

    const orderNumberPrefix = await getOrderNumberPrefix(prisma);

    const transactionResult = await prisma.$transaction(async (tx) => {
      const createdOrderIds: string[] = [];

      for (const orderData of orders) {
        console.log('Creating order for:', orderData.orderType);

        const recipientCustomerId = orderData.recipientCustomerId || null;
        const deliveryAddressId = orderData.deliveryAddressId || null;

        if (orderData.orderType === 'DELIVERY' && !recipientCustomerId) {
          console.warn('⚠️ Delivery order created without recipient - recipient should be managed via customer API');
        }

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

        const orderSourceRaw =
          typeof orderData.orderSource === 'string' ? orderData.orderSource.toUpperCase() : null;
        const orderSource =
          orderSourceRaw && Object.values(OrderSource).includes(orderSourceRaw as OrderSource)
            ? (orderSourceRaw as OrderSource)
            : requestOrderSource || OrderSource.PHONE;

        const order = await tx.order.create({
          data: {
            type: orderData.orderType,
            status: OrderStatus.DRAFT,
            paymentStatus: PaymentStatus.UNPAID,
            orderSource,
            customerId,
            recipientCustomerId,
            deliveryAddressId,
            cardMessage: orderData.cardMessage || null,
            occasion: orderData.occasion || null,
            specialInstructions: orderData.deliveryInstructions || null,
            deliveryDate: orderData.deliveryDate
              ? new Date(orderData.deliveryDate + 'T00:00:00')
              : null,
            deliveryTime: orderData.deliveryTime || null,
            deliveryFee: deliveryFeeInCents,
            discount: discountAmountCents,
            discountBreakdown,
            discountId,
            discountCode,
            taxBreakdown: taxCalculation.breakdown,
            totalTax: taxCalculation.totalAmount,
            paymentAmount: totalAmount,
            images: [],
            orderItems: {
              create: orderItems
            }
          },
          select: {
            id: true,
            orderNumber: true,
            paymentAmount: true,
            orderSource: true,
            status: true,
          }
        });

        await logOrderActivity({
          tx,
          orderId: order.id,
          type: OrderActivityType.ORDER_CREATED,
          summary: 'Order created',
          details: {
            source: order.orderSource,
            channel: orderSource,
            status: order.status,
          },
          actorId: req.employee?.id || null,
          actorName: req.employee?.name || null,
        });

        await recordDiscountUsage(
          appliedDiscounts,
          customerId,
          order.id,
          orderSource,
          tx,
        );

        createdOrderIds.push(order.id);
      }

      const totalAmount =
        typeof paymentTransaction?.totalAmount === 'number'
          ? Math.round(paymentTransaction.totalAmount)
          : paymentMethods.reduce((sum: number, method: any) => sum + (Number(method.amount) || 0), 0);

      const createdPaymentTransaction = await transactionService.createTransaction({
        customerId,
        employeeId:
          paymentTransaction?.employeeId ||
          req.employee?.id ||
          req.body.employee ||
          undefined,
        channel,
        totalAmount,
        taxAmount: Number(paymentTransaction?.taxAmount) || 0,
        tipAmount: Number(paymentTransaction?.tipAmount) || 0,
        notes:
          typeof paymentTransaction?.notes === 'string'
            ? paymentTransaction.notes
            : undefined,
        receiptEmail:
          typeof paymentTransaction?.receiptEmail === 'string'
            ? paymentTransaction.receiptEmail
            : undefined,
        paymentMethods,
        orderIds: createdOrderIds,
        idempotencyKey: normalizedIdempotencyKey,
      }, { tx });

      if (normalizedIdempotencyKey) {
        const linkedOrderIds = new Set(
          (createdPaymentTransaction.orderPayments || []).map((orderPayment: any) => orderPayment.orderId)
        );
        const allOrdersLinked = createdOrderIds.every((orderId) => linkedOrderIds.has(orderId));
        if (!allOrdersLinked) {
          throw new Error(IDEMPOTENCY_REPLAY_MARKER);
        }
      }

      return {
        createdOrderIds,
        paymentTransaction: createdPaymentTransaction,
      };
    });

    const createdOrdersUnordered = await prisma.order.findMany({
      where: { id: { in: transactionResult.createdOrderIds } },
      include: orderIncludeForResponse,
    });

    const createdOrdersById = new Map(
      createdOrdersUnordered.map((order) => [order.id, order])
    );
    const createdOrders = transactionResult.createdOrderIds
      .map((id) => createdOrdersById.get(id))
      .filter((order): order is NonNullable<typeof order> => Boolean(order));

    const printActions: Array<Record<string, any>> = [];

    for (const order of createdOrders) {
      triggerStatusNotifications(order as any, 'PAID', 'DRAFT')
        .then(() => {
          console.log(`✅ Order confirmation notifications sent for order #${order.orderNumber}`);
        })
        .catch((notifyError) => {
          console.error(
            `❌ Order confirmation notification failed for order #${order.orderNumber}:`,
            notifyError
          );
        });

      if (order.type === 'DELIVERY') {
        try {
          const result = await printService.queuePrintJob({
            type: PrintJobType.ORDER_TICKET,
            orderId: order.id,
            order: order as any,
            template: 'delivery-ticket-v1',
            priority: 10,
            orderNumberPrefix,
          });
          printActions.push({ orderId: order.id, orderNumber: order.orderNumber, ...result });
        } catch (printError) {
          console.error(`❌ Failed to queue delivery print job for order #${order.orderNumber}:`, printError);
        }
      }

      if (order.orderSource === 'POS' || order.orderSource === 'WALKIN') {
        try {
          const config = await printSettingsService.getConfigForType(PrintJobType.RECEIPT);
          const orderWithTransactions = {
            ...order,
            transactions: getOrderTransactions(order),
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
            orderId: order.id,
            order: jobOrder,
            template,
            priority: 10
          });
          printActions.push({ orderId: order.id, orderNumber: order.orderNumber, ...result });
        } catch (printError) {
          console.error(`❌ Failed to queue receipt print job for order #${order.orderNumber}:`, printError);
        }
      }
    }

    console.log(`Successfully created ${createdOrders.length} orders`);

    res.json({
      success: true,
      orders: createdOrders,
      totalAmount: createdOrders.reduce((sum, order) => sum + (order.paymentAmount || 0), 0),
      paymentTransaction: transactionResult.paymentTransaction,
      printActions,
    });
  } catch (error) {
    const replayKey =
      typeof req.body?.idempotencyKey === 'string' && req.body.idempotencyKey.trim().length > 0
        ? req.body.idempotencyKey.trim()
        : undefined;

    if (error instanceof Error && error.message === IDEMPOTENCY_REPLAY_MARKER && replayKey) {
      const replay = await getExistingTransactionReplay(replayKey);
      if (replay) {
        return res.json({
          success: true,
          replayed: true,
          orders: replay.orders,
          totalAmount: replay.orders.reduce((sum, order) => sum + (order.paymentAmount || 0), 0),
          paymentTransaction: replay.transaction,
          printActions: [],
        });
      }
    }

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

      await logOrderActivity({
        orderId: order.id,
        type: OrderActivityType.ORDER_CREATED,
        summary: 'Order created',
        details: {
          source: order.orderSource,
          channel: resolvedOrderSource || 'POS',
          status: order.status,
        },
        actorId: req.employee?.id || null,
        actorName: req.employee?.name || null,
      });

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
          idempotencyKey: paymentIntentId,
        });

        console.log(
          `✅ Created website payment transaction for ${paymentIntentId} (${group.orderIds.length} order(s))`
        );
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
