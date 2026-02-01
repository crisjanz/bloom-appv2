import express from 'express';
import prisma from '../lib/prisma';
import transactionService from '../services/transactionService';
import paymentProviderFactory from '../services/paymentProviders/PaymentProviderFactory';

const router = express.Router();

/**
 * POST /api/payment-transactions
 * Create a new payment transaction
 */
router.post('/', async (req, res) => {
  try {
    const {
      customerId,
      employeeId,
      channel,
      totalAmount,
      taxAmount,
      tipAmount,
      notes,
      receiptEmail,
      paymentMethods,
      orderIds,
      isAdjustment,
      orderPaymentAllocations
    } = req.body;

    const adjustmentFlag = Boolean(isAdjustment);
    const allocationList = Array.isArray(orderPaymentAllocations) ? orderPaymentAllocations : [];
    const resolvedOrderIds = adjustmentFlag
      ? allocationList
          .map((allocation: any) => allocation?.orderId)
          .filter((orderId: any): orderId is string => typeof orderId === 'string' && orderId.trim().length > 0)
      : Array.isArray(orderIds)
        ? orderIds
        : [];

    // Validation
    if (
      !customerId ||
      !channel ||
      !totalAmount ||
      !paymentMethods ||
      !Array.isArray(paymentMethods) ||
      resolvedOrderIds.length === 0 ||
      (adjustmentFlag && allocationList.length === 0)
    ) {
      return res.status(400).json({
        error: adjustmentFlag
          ? 'Missing required fields: customerId, channel, totalAmount, paymentMethods, orderPaymentAllocations'
          : 'Missing required fields: customerId, channel, totalAmount, paymentMethods, orderIds'
      });
    }

    // Validate payment methods sum equals total amount
    const paymentMethodsTotal = paymentMethods.reduce((sum: number, method: any) => sum + method.amount, 0);
    if (Math.abs(paymentMethodsTotal - totalAmount) > 0.01) {
      return res.status(400).json({
        error: 'Payment methods total does not match transaction total'
      });
    }

    if (adjustmentFlag) {
      const allocationTotal = allocationList.reduce((sum: number, allocation: any) => sum + allocation.amount, 0);
      if (Math.abs(allocationTotal - totalAmount) > 0.01) {
        return res.status(400).json({
          error: 'Order payment allocations total does not match transaction total'
        });
      }
    }

    const transaction = await transactionService.createTransaction({
      customerId,
      employeeId,
      channel,
      totalAmount,
      taxAmount,
      tipAmount,
      notes,
      receiptEmail,
      paymentMethods,
      orderIds: resolvedOrderIds,
      isAdjustment: adjustmentFlag,
      orderPaymentAllocations: allocationList
    });

    // Update Stripe PaymentIntent description with order numbers (fire-and-forget)
    const stripePaymentIntentIds = (paymentMethods as any[])
      .map((pm: any) => pm.paymentIntentId)
      .filter(Boolean) as string[];

    if (stripePaymentIntentIds.length > 0 && resolvedOrderIds.length > 0) {
      (async () => {
        try {
          const orders = await prisma.order.findMany({
            where: { id: { in: resolvedOrderIds } },
            select: { orderNumber: true },
          });
          const orderNumbers = orders
            .map((o) => o.orderNumber)
            .filter(Boolean)
            .sort((a, b) => a - b);
          if (orderNumbers.length > 0) {
            const stripe = await paymentProviderFactory.getStripeClient();
            const description = `Bloom POS - Order${orderNumbers.length > 1 ? 's' : ''} ${orderNumbers.join(', ')}`;
            await Promise.all(
              stripePaymentIntentIds.map((piId) =>
                stripe.paymentIntents.update(piId, { description })
              )
            );
          }
        } catch (err) {
          console.error('Failed to update Stripe PaymentIntent description:', err);
        }
      })();
    }

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating payment transaction:', error);
    res.status(500).json({ error: 'Failed to create payment transaction' });
  }
});

/**
 * GET /api/payment-transactions
 * List payment transactions with filters and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '25',
      startDate,
      endDate,
      status,
      provider,
      channel,
      search,
      paymentMethod
    } = req.query;

    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);

    const result = await transactionService.searchTransactions({
      page: Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage,
      limit: Number.isNaN(parsedLimit) || parsedLimit < 1 ? 25 : Math.min(parsedLimit, 100),
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      status: typeof status === 'string' && status !== 'ALL' ? status : undefined,
      provider: typeof provider === 'string' && provider !== 'ALL' ? provider : undefined,
      channel: typeof channel === 'string' && channel !== 'ALL' ? channel : undefined,
      search: typeof search === 'string' ? search : undefined,
      paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : undefined
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching payment transactions:', error);
    res.status(500).json({ error: 'Failed to fetch payment transactions' });
  }
});

/**
 * GET /api/payment-transactions/export
 * Export payment transactions as CSV
 */
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate, status, provider, channel, search, paymentMethod } = req.query;

    const csv = await transactionService.exportTransactions({
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      status: typeof status === 'string' && status !== 'ALL' ? status : undefined,
      provider: typeof provider === 'string' && provider !== 'ALL' ? provider : undefined,
      channel: typeof channel === 'string' && channel !== 'ALL' ? channel : undefined,
      search: typeof search === 'string' ? search : undefined,
      paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : undefined
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payment-transactions-${timestamp}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting payment transactions:', error);
    res.status(500).json({ error: 'Failed to export payment transactions' });
  }
});

/**
 * POST /api/payment-transactions/:transactionId/refunds
 * Process a refund for a transaction
 */
router.post('/:transactionId/refunds', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { amount, reason, employeeId, refundMethods } = req.body;

    if (!amount || !refundMethods) {
      return res.status(400).json({
        error: 'Missing required fields: amount, refundMethods'
      });
    }

    // Validate refund methods sum equals refund amount
    const refundMethodsTotal = refundMethods.reduce((sum: number, method: any) => sum + method.amount, 0);
    if (Math.abs(refundMethodsTotal - amount) > 0.01) {
      return res.status(400).json({
        error: 'Refund methods total does not match refund amount'
      });
    }

    const refund = await transactionService.processRefund(transactionId, {
      amount,
      reason,
      employeeId,
      refundMethods
    });

    res.status(201).json(refund);
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

/**
 * GET /api/payment-transactions/customer/:customerId
 * Get all transactions for a customer
 */
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const transactions = await transactionService.getCustomerTransactions(customerId);

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching customer transactions:', error);
    res.status(500).json({ error: 'Failed to fetch customer transactions' });
  }
});

/**
 * GET /api/payment-transactions/order/:orderId
 * Get all transactions for an order
 */
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const transactions = await transactionService.getOrderTransactions(orderId);

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching order transactions:', error);
    res.status(500).json({ error: 'Failed to fetch order transactions' });
  }
});

/**
 * GET /api/payment-transactions/reports/daily/:date
 * Get daily transaction summary
 */
router.get('/reports/daily/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const reportDate = new Date(date);
    
    if (isNaN(reportDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const summary = await transactionService.getDailyTransactionSummary(reportDate);
    
    res.json(summary);
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ error: 'Failed to generate daily report' });
  }
});

/**
 * POST /api/payment-transactions/generate-number
 * Generate a new PT-XXXX transaction number (for testing/preview)
 */
router.post('/generate-number', async (req, res) => {
  try {
    const transactionNumber = await transactionService.generateTransactionNumber();
    res.json({ transactionNumber });
  } catch (error) {
    console.error('Error generating transaction number:', error);
    res.status(500).json({ error: 'Failed to generate transaction number' });
  }
});

/**
 * GET /api/payment-transactions/:transactionNumber
 * Get a payment transaction by its PT-XXXX number
 */
router.get('/:transactionNumber', async (req, res) => {
  try {
    const { transactionNumber } = req.params;
    
    const transaction = await transactionService.getTransaction(transactionNumber);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

/**
 * PUT /api/payment-transactions/:id
 * Update a payment transaction (e.g. reassign customer)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId } = req.body;

    const updateData: any = {};
    if (customerId) {
      updateData.customerId = customerId;
    }

    const updated = await prisma.paymentTransaction.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

export default router;
