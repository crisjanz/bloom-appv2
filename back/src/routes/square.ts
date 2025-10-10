import express from 'express';
import squareService from '../services/squareService';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Create a payment
 * POST /api/square/payment
 */
router.post('/payment', async (req, res) => {
  try {
    const {
      amount,
      currency = 'CAD',
      customerId,
      customerPhone,
      customerEmail,
      customerName,
      description,
      metadata = {},
      sourceId, // Card nonce or payment source
      orderIds = [],
      saveCard = false
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Amount is required and must be greater than 0' 
      });
    }

    if (!sourceId) {
      return res.status(400).json({ 
        error: 'Payment source ID is required' 
      });
    }

    // Add order IDs to metadata for tracking
    const paymentDescription = description || `Bloom Flower Shop - Order${orderIds.length > 1 ? 's' : ''} ${orderIds.join(', ')}`;

    let squareCustomerId = customerId;

    // Create/find customer if we have contact info and want to save card
    if ((customerPhone || customerEmail) && !squareCustomerId) {
      try {
        console.log(`🔄 Creating/finding Square customer with data:`, {
          email: customerEmail,
          firstName: customerName?.split(' ')[0] || 'Customer',
          lastName: customerName?.split(' ').slice(1).join(' ') || '',
          phone: customerPhone,
          fullName: customerName
        });
        
        const customer = await squareService.createOrFindCustomer({
          email: customerEmail,
          firstName: customerName?.split(' ')[0] || 'Customer',
          lastName: customerName?.split(' ').slice(1).join(' ') || '',
          phone: customerPhone,
        });
        squareCustomerId = customer?.id;
        console.log(`✅ Created/found Square customer: ${squareCustomerId} for ${customerPhone || customerEmail}`, {
          customerId: customer?.id,
          name: customer?.given_name + ' ' + customer?.family_name,
          phone: customer?.phone_number,
          email: customer?.email_address
        });
      } catch (error) {
        console.warn('⚠️ Could not create Square customer, proceeding without:', error);
      }
    }

    console.log(`🔄 Creating Square payment with customer ID: ${squareCustomerId}`);

    const payment = await squareService.createPayment({
      amount,
      currency,
      customerId: squareCustomerId,
      description: paymentDescription,
      metadata,
      sourceId,
    });

    console.log(`✅ Square payment created:`, {
      paymentId: payment?.id,
      status: payment?.status,
      customerId: squareCustomerId,
      amount: payment?.amount_money?.amount ? Number(payment.amount_money.amount) / 100 : amount
    });

    // Note: In Square, card nonces are single-use and consumed during payment
    // Card saving in Square requires a different approach using recurring payments or customer cards
    // For now, we'll skip automatic card saving in sandbox as nonces are single-use
    if (payment?.status === 'COMPLETED' && squareCustomerId) {
      console.log(`ℹ️ Payment completed for customer ${squareCustomerId}. Card saving requires separate integration.`);
    }

    res.json({
      success: true,
      paymentId: payment?.id,
      status: payment?.status,
      amount: payment?.amount_money?.amount ? Number(payment.amount_money.amount) / 100 : amount,
      receiptUrl: payment?.receipt_url,
      customerId: squareCustomerId,
    });

  } catch (error) {
    console.error('❌ Square payment creation failed:', error);
    res.status(500).json({ 
      error: 'Failed to create payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get payment by ID
 * GET /api/square/payment/:id
 */
router.get('/payment/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await squareService.getPayment(id);

    res.json({
      success: true,
      payment: {
        id: payment?.id,
        status: payment?.status,
        amount: payment?.amountMoney?.amount ? Number(payment.amountMoney.amount) / 100 : null,
        currency: payment?.amountMoney?.currency,
        customerId: payment?.customerId,
        receiptUrl: payment?.receiptUrl,
        createdAt: payment?.createdAt,
      },
    });

  } catch (error) {
    console.error('❌ Square payment retrieval failed:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create or retrieve Square customer
 * POST /api/square/customer
 */
router.post('/customer', async (req, res) => {
  try {
    const { email, firstName, lastName, phone, companyName, metadata } = req.body;

    const customer = await squareService.createCustomer({
      email,
      firstName,
      lastName,
      phone,
      companyName,
      metadata,
    });

    res.json({
      success: true,
      customerId: customer?.id,
      email: customer?.emailAddress,
      firstName: customer?.givenName,
      lastName: customer?.familyName,
      phone: customer?.phoneNumber,
    });

  } catch (error) {
    console.error('❌ Square customer creation failed:', error);
    res.status(500).json({ 
      error: 'Failed to create customer',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Process refund
 * POST /api/square/refund
 */
router.post('/refund', async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;

    if (!paymentId) {
      return res.status(400).json({ 
        error: 'Payment ID is required' 
      });
    }

    const refund = await squareService.createRefund(paymentId, amount, reason);

    res.json({
      success: true,
      refundId: refund?.id,
      amount: refund?.amountMoney?.amount ? Number(refund.amountMoney.amount) / 100 : null,
      status: refund?.status,
    });

  } catch (error) {
    console.error('❌ Square refund failed:', error);
    res.status(500).json({ 
      error: 'Failed to process refund',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create terminal checkout for Square Reader
 * POST /api/square/terminal/checkout
 */
router.post('/terminal/checkout', async (req, res) => {
  try {
    const { amount, description, orderIds = [], deviceId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Amount is required and must be greater than 0' 
      });
    }

    const checkoutDescription = description || `Bloom Order${orderIds.length > 1 ? 's' : ''} ${orderIds.join(', ')}`;

    const checkout = await squareService.createTerminalCheckout(amount, checkoutDescription, deviceId);

    res.json({
      success: true,
      checkoutId: checkout?.id,
      status: checkout?.status,
      amount,
      deviceId: checkout?.device_options?.device_id,
    });

  } catch (error) {
    console.error('❌ Square terminal checkout failed:', error);
    res.status(500).json({ 
      error: 'Failed to create terminal checkout',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get terminal checkout status
 * GET /api/square/terminal/checkout/:id
 */
router.get('/terminal/checkout/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const checkout = await squareService.getTerminalCheckout(id);

    res.json({
      success: true,
      checkout: {
        id: checkout?.id,
        status: checkout?.status,
        amount: checkout?.amount_money?.amount ? checkout.amount_money.amount / 100 : null,
        paymentId: checkout?.payment_ids?.[0],
        createdAt: checkout?.created_at,
        updatedAt: checkout?.updated_at,
      },
    });

  } catch (error) {
    console.error('❌ Square terminal checkout retrieval failed:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve terminal checkout',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Cancel terminal checkout
 * POST /api/square/terminal/checkout/:id/cancel
 */
router.post('/terminal/checkout/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const checkout = await squareService.cancelTerminalCheckout(id);

    res.json({
      success: true,
      checkoutId: checkout?.id,
      status: checkout?.status,
    });

  } catch (error) {
    console.error('❌ Square terminal checkout cancellation failed:', error);
    res.status(500).json({ 
      error: 'Failed to cancel terminal checkout',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Find customer and get saved payment methods
 * POST /api/square/customer/payment-methods
 */
router.post('/customer/payment-methods', async (req, res) => {
  try {
    const { phone, email } = req.body;

    if (!phone && !email) {
      return res.status(400).json({ 
        error: 'Phone number or email is required' 
      });
    }

    // Find customer by contact
    const customer = await squareService.findCustomerByContact(phone, email);
    
    if (!customer) {
      return res.json({
        success: true,
        customer: null,
        paymentMethods: [],
      });
    }

    // Get saved cards
    const cards = await squareService.getCustomerCards(customer.id);

    res.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.given_name && customer.family_name 
          ? `${customer.given_name} ${customer.family_name}` 
          : customer.given_name || customer.family_name || 'Customer',
        email: customer.email_address,
        phone: customer.phone_number,
      },
      paymentMethods: cards.map(card => ({
        id: card.id,
        type: card.card_brand?.toLowerCase() || 'card',
        last4: card.last_4,
        expMonth: card.exp_month ? parseInt(card.exp_month.toString()) : 0,
        expYear: card.exp_year ? parseInt(card.exp_year.toString()) : 0,
      })),
    });

  } catch (error) {
    console.error('❌ Failed to get Square customer payment methods:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve payment methods',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Process payment with saved card
 * POST /api/square/payment/saved-card
 */
router.post('/payment/saved-card', async (req, res) => {
  try {
    const {
      amount,
      currency = 'CAD',
      customerId,
      customerCardId,
      description,
      orderIds = []
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Amount is required and must be greater than 0' 
      });
    }

    if (!customerId || !customerCardId) {
      return res.status(400).json({ 
        error: 'Customer ID and Card ID are required' 
      });
    }

    const paymentDescription = description || `Bloom Flower Shop - Order${orderIds.length > 1 ? 's' : ''} ${orderIds.join(', ')}`;

    const payment = await squareService.createPaymentWithSavedCard({
      amount,
      currency,
      customerId,
      customerCardId,
      description: paymentDescription,
    });

    res.json({
      success: true,
      paymentId: payment?.id,
      status: payment?.status,
      amount: payment?.amount_money?.amount ? Number(payment.amount_money.amount) / 100 : amount,
      receiptUrl: payment?.receipt_url,
    });

  } catch (error) {
    console.error('❌ Square saved card payment failed:', error);
    res.status(500).json({ 
      error: 'Failed to process payment with saved card',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Square webhook endpoint
 * POST /api/square/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-square-signature'] as string;
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    if (!signature || !signatureKey) {
      console.error('❌ Missing Square webhook signature or key');
      return res.status(400).send('Missing signature or key');
    }

    // Verify webhook signature
    const isValid = squareService.verifyWebhookSignature(
      req.body.toString(),
      signature,
      signatureKey
    );

    if (!isValid) {
      console.error('❌ Square webhook signature verification failed');
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(req.body.toString());
    console.log(`✅ Square webhook verified: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'payment.created': {
        const payment = event.data.object.payment;
        console.log(`💰 Square payment created: ${payment.id} for $${Number(payment.amount_money.amount) / 100}`);
        
        // Update payment transaction in database if needed
        await updatePaymentTransactionStatus(payment, 'COMPLETED');
        break;
      }

      case 'payment.updated': {
        const payment = event.data.object.payment;
        console.log(`🔄 Square payment updated: ${payment.id} - Status: ${payment.status}`);
        
        if (payment.status === 'COMPLETED') {
          await updatePaymentTransactionStatus(payment, 'COMPLETED');
        } else if (payment.status === 'FAILED') {
          await updatePaymentTransactionStatus(payment, 'FAILED');
        }
        break;
      }

      case 'refund.created': {
        const refund = event.data.object.refund;
        console.log(`💸 Square refund created: ${refund.id} for payment ${refund.payment_id}`);
        break;
      }

      case 'terminal.checkout.created': {
        const checkout = event.data.object.checkout;
        console.log(`🏪 Square terminal checkout created: ${checkout.id}`);
        break;
      }

      case 'terminal.checkout.updated': {
        const checkout = event.data.object.checkout;
        console.log(`🔄 Square terminal checkout updated: ${checkout.id} - Status: ${checkout.status}`);
        break;
      }

      default:
        console.log(`🔔 Unhandled Square event: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('❌ Square webhook processing failed:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check endpoint
 * GET /api/square/health
 */
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await squareService.healthCheck();
    const location = isHealthy ? await squareService.getLocation() : null;
    
    res.json({
      success: true,
      service: 'Square',
      status: isHealthy ? 'connected' : 'disconnected',
      location: location ? {
        id: location.id,
        name: location.name,
        address: location.address,
        timezone: location.timezone,
      } : null,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Square health check failed:', error);
    res.status(500).json({ 
      success: false,
      service: 'Square',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Helper function to update payment transaction status in database
 */
async function updatePaymentTransactionStatus(
  payment: any, 
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED'
) {
  try {
    // Find payment transaction by Square payment ID
    const paymentTransaction = await prisma.paymentTransaction.findFirst({
      where: {
        paymentMethods: {
          some: {
            providerTransactionId: payment.id,
          }
        }
      },
      include: {
        paymentMethods: true,
        orderPayments: {
          include: {
            order: true,
          }
        }
      }
    });

    if (!paymentTransaction) {
      console.log(`⚠️ No payment transaction found for Square payment: ${payment.id}`);
      return;
    }

    // Update payment transaction status
    await prisma.paymentTransaction.update({
      where: { id: paymentTransaction.id },
      data: { status }
    });

    // Update associated orders status if payment completed
    if (status === 'COMPLETED') {
      const orderIds = paymentTransaction.orderPayments.map(op => op.orderId);
      
      await prisma.order.updateMany({
        where: { 
          id: { in: orderIds },
          status: 'DRAFT' // Only update orders that are still in draft status
        },
        data: { status: 'PAID' }
      });

      console.log(`✅ Updated ${orderIds.length} orders to PAID status`);
    }

    console.log(`✅ Updated payment transaction ${paymentTransaction.transactionNumber} to ${status}`);

  } catch (error) {
    console.error('❌ Failed to update payment transaction status:', error);
  }
}

export default router;