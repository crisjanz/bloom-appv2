import express from 'express';
import Stripe from 'stripe';
import stripeService from '../services/stripeService';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Create a payment intent
 * POST /api/stripe/payment-intent
 */
router.post('/payment-intent', async (req, res) => {
  try {
    const {
      amount,
      currency = 'cad',
      customerId,
      customerEmail,
      description,
      metadata = {},
      orderIds = []
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Amount is required and must be greater than 0' 
      });
    }

    // Add order IDs to metadata for tracking
    if (orderIds.length > 0) {
      metadata.orderIds = orderIds.join(',');
      metadata.source = 'bloom-flower-shop';
    }

    const paymentIntent = await stripeService.createPaymentIntent({
      amount,
      currency,
      customerId,
      customerEmail,
      description: description || `Bloom Flower Shop - Order${orderIds.length > 1 ? 's' : ''} ${orderIds.join(', ')}`,
      metadata,
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert back to dollars for frontend
    });

  } catch (error) {
    console.error('❌ Payment intent creation failed:', error);
    res.status(500).json({ 
      error: 'Failed to create payment intent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Confirm a payment intent
 * POST /api/stripe/payment-intent/:id/confirm
 */
router.post('/payment-intent/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethodId } = req.body;

    const paymentIntent = await stripeService.confirmPaymentIntent(id, paymentMethodId);

    res.json({
      success: true,
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('❌ Payment intent confirmation failed:', error);
    res.status(500).json({ 
      error: 'Failed to confirm payment intent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create or retrieve Stripe customer
 * POST /api/stripe/customer
 */
router.post('/customer', async (req, res) => {
  try {
    const { email, name, phone, metadata } = req.body;

    if (!email || !name) {
      return res.status(400).json({ 
        error: 'Email and name are required' 
      });
    }

    const customer = await stripeService.createCustomer({
      email,
      name,
      phone,
      metadata,
    });

    res.json({
      success: true,
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
    });

  } catch (error) {
    console.error('❌ Stripe customer creation failed:', error);
    res.status(500).json({ 
      error: 'Failed to create customer',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Process refund
 * POST /api/stripe/refund
 */
router.post('/refund', async (req, res) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ 
        error: 'Payment intent ID is required' 
      });
    }

    const refund = await stripeService.createRefund(paymentIntentId, amount, reason);

    res.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount ? refund.amount / 100 : null, // Convert back to dollars
      status: refund.status,
    });

  } catch (error) {
    console.error('❌ Stripe refund failed:', error);
    res.status(500).json({ 
      error: 'Failed to process refund',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Stripe webhook endpoint
 * POST /api/stripe/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event: Stripe.Event;

  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      console.error('❌ No Stripe signature found in webhook');
      return res.status(400).send('No signature found');
    }

    // Verify webhook signature
    event = stripeService.verifyWebhookSignature(req.body, signature);
    console.log(`✅ Stripe webhook verified: ${event.type}`);

  } catch (error) {
    console.error('❌ Stripe webhook verification failed:', error);
    return res.status(400).send('Webhook signature verification failed');
  }

  try {
    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`💰 Payment succeeded: ${paymentIntent.id} for $${(paymentIntent.amount / 100).toFixed(2)}`);
        
        // Extract order IDs from metadata
        const orderIds = paymentIntent.metadata?.orderIds?.split(',') || [];
        
        // Update payment transaction in database
        if (orderIds.length > 0) {
          await updatePaymentTransactionStatus(paymentIntent, 'COMPLETED');
        }
        
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`❌ Payment failed: ${paymentIntent.id}`);
        
        const orderIds = paymentIntent.metadata?.orderIds?.split(',') || [];
        if (orderIds.length > 0) {
          await updatePaymentTransactionStatus(paymentIntent, 'FAILED');
        }
        
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`🚫 Payment cancelled: ${paymentIntent.id}`);
        
        const orderIds = paymentIntent.metadata?.orderIds?.split(',') || [];
        if (orderIds.length > 0) {
          await updatePaymentTransactionStatus(paymentIntent, 'CANCELLED');
        }
        
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        console.log(`⚠️ Dispute created: ${dispute.id} for charge ${dispute.charge}`);
        // Handle dispute logic here
        break;
      }

      default:
        console.log(`🔔 Unhandled Stripe event: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('❌ Stripe webhook processing failed:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check endpoint
 * GET /api/stripe/health
 */
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await stripeService.healthCheck();
    
    res.json({
      success: true,
      service: 'Stripe',
      status: isHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Stripe health check failed:', error);
    res.status(500).json({ 
      success: false,
      service: 'Stripe',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Find customer and get saved payment methods
 * POST /api/stripe/customer/payment-methods
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
    const customer = await stripeService.findCustomerByContact(phone, email);
    
    if (!customer) {
      return res.json({
        success: true,
        customer: null,
        paymentMethods: [],
      });
    }

    // Get saved payment methods
    const paymentMethods = await stripeService.getCustomerPaymentMethods(customer.id);

    res.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      paymentMethods: paymentMethods.map(pm => ({
        id: pm.id,
        type: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      })),
    });

  } catch (error) {
    console.error('❌ Failed to get customer payment methods:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve payment methods',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Helper function to update payment transaction status in database
 */
async function updatePaymentTransactionStatus(
  paymentIntent: Stripe.PaymentIntent, 
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED'
) {
  try {
    // Find payment transaction by Stripe payment intent ID
    const paymentTransaction = await prisma.paymentTransaction.findFirst({
      where: {
        paymentMethods: {
          some: {
            providerTransactionId: paymentIntent.id,
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
      console.log(`⚠️ No payment transaction found for Stripe PaymentIntent: ${paymentIntent.id}`);
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