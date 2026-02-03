import express from 'express';
import type Stripe from 'stripe';
import { PaymentProvider, PrismaClient } from '@prisma/client';
import paymentProviderFactory from '../services/paymentProviders/PaymentProviderFactory';
import { getSettingsRecord } from '../services/paymentSettingsService';
import providerCustomerService from '../services/providerCustomerService';

const router = express.Router();
const prisma = new PrismaClient();

type StripeOrderPaymentInfo = {
  orderId: string;
  orderNumber?: number | null;
  orderCustomerId?: string | null;
  transactionId: string;
  transactionNumber: string;
  transactionChannel: string;
  transactionCustomerId: string;
  paymentIntentId: string;
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
  cardLast4?: string | null;
  cardBrand?: string | null;
};

const buildStripeCustomerName = (customerName?: string, customerEmail?: string) => {
  if (customerName && customerName.trim().length > 0) {
    return customerName;
  }
  if (customerEmail) {
    return customerEmail.split('@')[0] || 'Customer';
  }
  return 'Customer';
};

const serializeStripeObject = (value: unknown) => {
  return JSON.parse(JSON.stringify(value));
};

const refreshStripeCustomerLink = async ({
  stripe,
  bloomCustomerId,
  customerEmail,
  customerName,
  customerPhone,
}: {
  stripe: Stripe;
  bloomCustomerId: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
}) => {
  const stripeCustomer = await stripe.customers.create({
    email: customerEmail,
    name: buildStripeCustomerName(customerName, customerEmail),
    phone: customerPhone,
    metadata: {
      bloomCustomerId,
    },
  });

  const existing = await prisma.providerCustomer.findFirst({
    where: {
      customerId: bloomCustomerId,
      provider: PaymentProvider.STRIPE,
      isActive: true,
    },
    orderBy: [
      { isPrimary: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  if (existing) {
    await prisma.providerCustomer.update({
      where: { id: existing.id },
      data: {
        providerCustomerId: stripeCustomer.id,
        providerEmail: stripeCustomer.email || existing.providerEmail,
        providerMetadata: serializeStripeObject(stripeCustomer),
        isActive: true,
        isPrimary: true,
        lastSyncAt: new Date(),
      },
    });
    await prisma.providerCustomer.updateMany({
      where: {
        customerId: bloomCustomerId,
        provider: PaymentProvider.STRIPE,
        id: { not: existing.id },
      },
      data: { isPrimary: false },
    });
  } else {
    await prisma.providerCustomer.create({
      data: {
        customerId: bloomCustomerId,
        provider: PaymentProvider.STRIPE,
        providerCustomerId: stripeCustomer.id,
        providerEmail: stripeCustomer.email || undefined,
        providerMetadata: serializeStripeObject(stripeCustomer),
        isActive: true,
        isPrimary: true,
        lastSyncAt: new Date(),
      },
    });
  }

  return stripeCustomer.id;
};

const resolvePaymentMetadata = (metadata: any) => {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  return metadata;
};

async function getStripePaymentInfoForOrder(orderId: string): Promise<StripeOrderPaymentInfo | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, customerId: true }
  });

  if (!order) {
    return null;
  }

  const orderPayments = await prisma.orderPayment.findMany({
    where: { orderId },
    include: {
      transaction: {
        include: {
          paymentMethods: true
        }
      }
    }
  });

  const transactions = orderPayments
    .map((orderPayment) => orderPayment.transaction)
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  for (const transaction of transactions) {
    if (transaction.status !== 'COMPLETED') {
      continue;
    }

    const stripeMethod = transaction.paymentMethods?.find(
      (method: any) =>
        method.type === 'CARD' &&
        method.provider === 'STRIPE' &&
        typeof method.providerTransactionId === 'string' &&
        method.providerTransactionId.length > 0
    );

    if (!stripeMethod) {
      continue;
    }

    const metadata = resolvePaymentMetadata(stripeMethod.providerMetadata);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderCustomerId: order.customerId,
      transactionId: transaction.id,
      transactionNumber: transaction.transactionNumber,
      transactionChannel: transaction.channel,
      transactionCustomerId: transaction.customerId,
      paymentIntentId: stripeMethod.providerTransactionId,
      stripeCustomerId: metadata.stripeCustomerId || metadata.customerId || undefined,
      stripePaymentMethodId: metadata.paymentMethodId || metadata.stripePaymentMethodId || undefined,
      cardLast4: stripeMethod.cardLast4,
      cardBrand: stripeMethod.cardBrand
    };
  }

  return null;
}

async function resolveStripeCustomerId(
  orderCustomerId?: string | null,
  paymentIntentCustomerId?: string | null
): Promise<string | undefined> {
  if (paymentIntentCustomerId) {
    return paymentIntentCustomerId;
  }

  if (!orderCustomerId) {
    return undefined;
  }

  const providerCustomer = await providerCustomerService.getProviderCustomer(orderCustomerId, PaymentProvider.STRIPE);
  return providerCustomer?.providerCustomerId || undefined;
}

async function resolveStripePaymentMethodId(
  stripe: Stripe,
  customerId?: string,
  paymentMethodId?: string
): Promise<string | undefined> {
  if (paymentMethodId) {
    return paymentMethodId;
  }

  if (!customerId) {
    return undefined;
  }

  const customer = await stripe.customers.retrieve(customerId);
  if (!('deleted' in customer)) {
    const defaultMethod = customer.invoice_settings?.default_payment_method;
    if (defaultMethod) {
      return typeof defaultMethod === 'string' ? defaultMethod : defaultMethod.id;
    }
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card'
  });

  return paymentMethods.data[0]?.id;
}

/**
 * Get Stripe publishable key (public, no auth required)
 * GET /api/stripe/public-key
 */
router.get('/public-key', async (_req, res) => {
  try {
    const settings = await getSettingsRecord();
    const publicKey = settings?.stripePublicKey;
    if (!publicKey) {
      return res.status(404).json({ error: 'Stripe publishable key not configured' });
    }
    res.json({ publicKey });
  } catch (error) {
    console.error('Failed to fetch Stripe public key:', error);
    res.status(500).json({ error: 'Failed to fetch Stripe public key' });
  }
});

/**
 * Create Stripe Terminal connection token
 * POST /api/stripe/terminal/connection-token
 */
router.post('/terminal/connection-token', async (_req, res) => {
  try {
    const stripe = await paymentProviderFactory.getStripeClient();
    const token = await stripe.terminal.connectionTokens.create();
    res.json({ success: true, secret: token.secret });
  } catch (error) {
    console.error('❌ Failed to create terminal connection token:', error);
    res.status(500).json({
      error: 'Failed to create terminal connection token',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * List Stripe Terminal readers
 * GET /api/stripe/terminal/readers
 */
router.get('/terminal/readers', async (_req, res) => {
  try {
    const stripe = await paymentProviderFactory.getStripeClient();
    const readers = await stripe.terminal.readers.list({ limit: 20 });
    res.json({
      success: true,
      readers: readers.data.map((reader) => ({
        id: reader.id,
        label: reader.label,
        status: reader.status,
        deviceType: reader.device_type,
        location: reader.location,
      })),
    });
  } catch (error) {
    console.error('❌ Failed to list terminal readers:', error);
    res.status(500).json({
      error: 'Failed to list terminal readers',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Process Stripe Terminal payment
 * POST /api/stripe/terminal/process-payment
 */
router.post('/terminal/process-payment', async (req, res) => {
  try {
    const {
      amount,
      currency = 'cad',
      readerId,
      customerId,
      bloomCustomerId,
      customerEmail,
      customerPhone,
      customerName,
      orderIds = [],
      metadata = {},
    } = req.body;

    if (!readerId) {
      return res.status(400).json({ error: 'Reader ID is required' });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount is required and must be greater than 0' });
    }

    const amountInCents = Math.round(parsedAmount);
    const metadataPayload = metadata && typeof metadata === 'object' ? metadata : {};
    const orderIdList = Array.isArray(orderIds) ? orderIds : [];

    if (orderIdList.length > 0) {
      metadataPayload.orderIds = orderIdList.join(',');
      metadataPayload.source = 'bloom-flower-shop';
    }
    if (bloomCustomerId) {
      metadataPayload.bloomCustomerId = bloomCustomerId;
    }

    const stripe = await paymentProviderFactory.getStripeClient();

    let resolvedCustomerId = customerId;
    if (bloomCustomerId && !resolvedCustomerId) {
      const result = await providerCustomerService.getOrCreateStripeCustomer(bloomCustomerId, {
        email: customerEmail || '',
        name: customerName || customerEmail?.split('@')[0] || 'Customer',
        phone: customerPhone,
      });
      resolvedCustomerId = result.stripeCustomerId;
      console.log(`${result.isNew ? '✅ Created' : '♻️ Reused'} Stripe customer: ${resolvedCustomerId} for ${customerPhone || customerEmail}`);
    } else if ((customerPhone || customerEmail) && !resolvedCustomerId) {
      if (customerEmail) {
        const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
        if (existing.data.length > 0) {
          resolvedCustomerId = existing.data[0].id;
          console.log(`♻️ Reused Stripe customer: ${resolvedCustomerId} for ${customerEmail}`);
        }
      }

      if (!resolvedCustomerId) {
        const customer = await stripe.customers.create({
          email: customerEmail,
          name: customerName || customerEmail?.split('@')[0] || 'Customer',
          phone: customerPhone,
        });
        resolvedCustomerId = customer.id;
        console.log(`✅ Created Stripe customer: ${resolvedCustomerId} for ${customerPhone || customerEmail}`);
      }
    }

    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency,
        customer: resolvedCustomerId,
        description: `Bloom POS - Order ${orderIdList.join(', ')}`.trim(),
        metadata: metadataPayload,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        receipt_email: customerEmail,
        setup_future_usage: resolvedCustomerId ? 'off_session' : undefined,
      });
    } catch (error: any) {
      if (error?.code === 'resource_missing' && error?.param === 'customer') {
        if (bloomCustomerId) {
          const refreshedCustomerId = await refreshStripeCustomerLink({
            stripe,
            bloomCustomerId,
            customerEmail,
            customerName,
            customerPhone,
          });
          resolvedCustomerId = refreshedCustomerId;
        } else {
          const stripeCustomer = await stripe.customers.create({
            email: customerEmail,
            name: buildStripeCustomerName(customerName, customerEmail),
            phone: customerPhone,
          });
          resolvedCustomerId = stripeCustomer.id;
        }

        paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency,
          customer: resolvedCustomerId,
          description: `Bloom POS - Order ${orderIdList.join(', ')}`.trim(),
          metadata: metadataPayload,
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          receipt_email: customerEmail,
          setup_future_usage: resolvedCustomerId ? 'off_session' : undefined,
        });
      } else {
        throw error;
      }
    }

    await stripe.terminal.readers.processPaymentIntent(readerId, {
      payment_intent: paymentIntent.id,
    });

    res.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      readerId,
    });
  } catch (error) {
    console.error('❌ Terminal payment processing failed:', error);
    res.status(500).json({
      error: 'Failed to process terminal payment',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Poll Stripe Terminal payment status
 * GET /api/stripe/terminal/payment-status/:paymentIntentId
 */
router.get('/terminal/payment-status/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const stripe = await paymentProviderFactory.getStripeClient();

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.payment_method_details.card'],
    });

    const charge: any =
      paymentIntent.latest_charge && typeof paymentIntent.latest_charge === 'object'
        ? paymentIntent.latest_charge
        : null;

    const fingerprint = charge?.payment_method_details?.card?.fingerprint as string | undefined;
    const last4 = charge?.payment_method_details?.card?.last4 as string | undefined;
    const brand = charge?.payment_method_details?.card?.brand as string | undefined;
    const expMonth = charge?.payment_method_details?.card?.exp_month as number | undefined;
    const expYear = charge?.payment_method_details?.card?.exp_year as number | undefined;
    const bloomCustomerId = (paymentIntent.metadata as any)?.bloomCustomerId as string | undefined;
    const stripePaymentMethodId =
      typeof paymentIntent.payment_method === 'string'
        ? paymentIntent.payment_method
        : paymentIntent.payment_method?.id;
    const stripeCustomerId =
      typeof paymentIntent.customer === 'string' ? paymentIntent.customer : undefined;

    if (paymentIntent.status === 'succeeded' && fingerprint && bloomCustomerId) {
      const existing = await prisma.customerPaymentMethod.findFirst({
        where: { customerId: bloomCustomerId, cardFingerprint: fingerprint },
      });

      if (existing) {
        await prisma.customerPaymentMethod.update({
          where: { id: existing.id },
          data: {
            stripePaymentMethodId: stripePaymentMethodId ?? existing.stripePaymentMethodId,
            stripeCustomerId: stripeCustomerId ?? existing.stripeCustomerId,
            last4: last4 ?? existing.last4,
            brand: brand ?? existing.brand,
            expMonth: expMonth ?? existing.expMonth,
            expYear: expYear ?? existing.expYear,
          },
        });
      } else {
        await prisma.customerPaymentMethod.create({
          data: {
            customerId: bloomCustomerId,
            stripePaymentMethodId,
            stripeCustomerId,
            cardFingerprint: fingerprint,
            last4: last4 ?? '',
            brand: brand ?? 'card',
            expMonth: expMonth ?? 0,
            expYear: expYear ?? 0,
          },
        });
      }
    }

    res.json({
      success: true,
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
      cardFingerprint: fingerprint,
      cardLast4: last4,
      cardBrand: brand,
    });
  } catch (error) {
    console.error('❌ Failed to poll terminal payment status:', error);
    res.status(500).json({
      error: 'Failed to retrieve terminal payment status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Cancel a Stripe Terminal reader action
 * POST /api/stripe/terminal/cancel-action/:readerId
 */
router.post('/terminal/cancel-action/:readerId', async (req, res) => {
  try {
    const { readerId } = req.params;
    const stripe = await paymentProviderFactory.getStripeClient();
    const result = await stripe.terminal.readers.cancelAction(readerId);
    res.json({ success: true, action: result.action });
  } catch (error) {
    console.error('❌ Failed to cancel terminal reader action:', error);
    res.status(500).json({
      error: 'Failed to cancel terminal reader action',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

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
      bloomCustomerId,
      customerEmail,
      customerPhone,
      customerName,
      description,
      metadata = {},
      orderIds = []
    } = req.body;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ 
        error: 'Amount is required and must be greater than 0' 
      });
    }

    const amountInCents = Math.round(parsedAmount);
    const metadataPayload =
      metadata && typeof metadata === 'object' ? metadata : {};
    const orderIdList = Array.isArray(orderIds) ? orderIds : [];

    // Add order IDs to metadata for tracking
    if (orderIdList.length > 0) {
      metadataPayload.orderIds = orderIdList.join(',');
      metadataPayload.source = 'bloom-flower-shop';
    }
    if (bloomCustomerId) {
      metadataPayload.bloomCustomerId = bloomCustomerId;
    }

    const stripe = await paymentProviderFactory.getStripeClient();

    let resolvedCustomerId = customerId;
    if (bloomCustomerId && !resolvedCustomerId) {
      const result = await providerCustomerService.getOrCreateStripeCustomer(bloomCustomerId, {
        email: customerEmail || '',
        name: customerName || customerEmail?.split('@')[0] || 'Customer',
        phone: customerPhone,
      });
      resolvedCustomerId = result.stripeCustomerId;
      console.log(`${result.isNew ? '✅ Created' : '♻️ Reused'} Stripe customer: ${resolvedCustomerId} for ${customerPhone || customerEmail}`);
    } else if ((customerPhone || customerEmail) && !resolvedCustomerId) {
      if (customerEmail) {
        const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
        if (existing.data.length > 0) {
          resolvedCustomerId = existing.data[0].id;
          console.log(`♻️ Reused Stripe customer: ${resolvedCustomerId} for ${customerEmail}`);
        }
      }

      if (!resolvedCustomerId) {
        const customer = await stripe.customers.create({
          email: customerEmail,
          name: customerName || customerEmail?.split('@')[0] || 'Customer',
          phone: customerPhone,
        });
        resolvedCustomerId = customer.id;
        console.log(`✅ Created Stripe customer: ${resolvedCustomerId} for ${customerPhone || customerEmail}`);
      }
    }

    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency,
        customer: resolvedCustomerId,
        description: description || `Bloom POS - Order${orderIdList.length > 1 ? 's' : ''} ${orderIdList.join(', ')}`,
        metadata: metadataPayload,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        receipt_email: customerEmail,
        setup_future_usage: resolvedCustomerId ? 'off_session' : undefined,
      });
    } catch (error: any) {
      if (error?.code === 'resource_missing' && error?.param === 'customer') {
        if (bloomCustomerId) {
          const refreshedCustomerId = await refreshStripeCustomerLink({
            stripe,
            bloomCustomerId,
            customerEmail,
            customerName,
            customerPhone,
          });
          resolvedCustomerId = refreshedCustomerId;
        } else {
          const stripeCustomer = await stripe.customers.create({
            email: customerEmail,
            name: buildStripeCustomerName(customerName, customerEmail),
            phone: customerPhone,
          });
          resolvedCustomerId = stripeCustomer.id;
        }

        paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency,
          customer: resolvedCustomerId,
          description: description || `Bloom POS - Order${orderIdList.length > 1 ? 's' : ''} ${orderIdList.join(', ')}`,
          metadata: metadataPayload,
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          receipt_email: customerEmail,
          setup_future_usage: resolvedCustomerId ? 'off_session' : undefined,
        });
      } else {
        throw error;
      }
    }

    console.log(
      `✅ Stripe PaymentIntent created: ${paymentIntent.id} for $${(amountInCents / 100).toFixed(2)}`
    );

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
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

    const stripe = await paymentProviderFactory.getStripeClient();
    const confirmData: Stripe.PaymentIntentConfirmParams = {};

    if (paymentMethodId) {
      confirmData.payment_method = paymentMethodId;
    }

    const paymentIntent = await stripe.paymentIntents.confirm(id, confirmData);

    const detailedIntent = await stripe.paymentIntents.retrieve(paymentIntent.id, {
      expand: ['latest_charge']
    });

    const charge: any = detailedIntent.latest_charge && typeof detailedIntent.latest_charge === 'object'
      ? detailedIntent.latest_charge
      : null;

    const fingerprint = charge?.payment_method_details?.card?.fingerprint as string | undefined;
    const last4 = charge?.payment_method_details?.card?.last4 as string | undefined;
    const brand = charge?.payment_method_details?.card?.brand as string | undefined;
    const expMonth = charge?.payment_method_details?.card?.exp_month as number | undefined;
    const expYear = charge?.payment_method_details?.card?.exp_year as number | undefined;
    const bloomCustomerId = (detailedIntent.metadata as any)?.bloomCustomerId as string | undefined;
    const stripePaymentMethodId =
      typeof detailedIntent.payment_method === 'string'
        ? detailedIntent.payment_method
        : detailedIntent.payment_method?.id;
    const stripeCustomerId =
      typeof detailedIntent.customer === 'string' ? detailedIntent.customer : undefined;

    if (fingerprint && bloomCustomerId) {
      const existing = await prisma.customerPaymentMethod.findFirst({
        where: { customerId: bloomCustomerId, cardFingerprint: fingerprint }
      });

      if (existing) {
        await prisma.customerPaymentMethod.update({
          where: { id: existing.id },
          data: {
            stripePaymentMethodId: stripePaymentMethodId ?? existing.stripePaymentMethodId,
            stripeCustomerId: stripeCustomerId ?? existing.stripeCustomerId,
            last4: last4 ?? existing.last4,
            brand: brand ?? existing.brand,
            expMonth: expMonth ?? existing.expMonth,
            expYear: expYear ?? existing.expYear
          }
        });
      } else {
        await prisma.customerPaymentMethod.create({
          data: {
            customerId: bloomCustomerId,
            stripePaymentMethodId,
            stripeCustomerId,
            cardFingerprint: fingerprint,
            last4: last4 ?? '',
            brand: brand ?? 'card',
            expMonth: expMonth ?? 0,
            expYear: expYear ?? 0
          }
        });
      }
    }

    res.json({
      success: true,
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
      cardFingerprint: fingerprint,
      cardLast4: last4,
      cardBrand: brand,
      stripePaymentMethodId,
      stripeCustomerId
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

    const stripe = await paymentProviderFactory.getStripeClient();
    const customer = await stripe.customers.create({
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
    const { paymentIntentId, amount, reason, orderId } = req.body;

    if (!paymentIntentId && !orderId) {
      return res.status(400).json({ 
        error: 'Payment intent ID or order ID is required' 
      });
    }

    const stripe = await paymentProviderFactory.getStripeClient();
    const orderPaymentInfo = orderId ? await getStripePaymentInfoForOrder(orderId) : null;
    const resolvedPaymentIntentId = paymentIntentId || orderPaymentInfo?.paymentIntentId;

    if (!resolvedPaymentIntentId) {
      return res.status(404).json({
        error: 'No Stripe payment found for this order'
      });
    }

    const refundData: Stripe.RefundCreateParams = {
      payment_intent: resolvedPaymentIntentId,
    };

    const parsedAmount = Number(amount);
    if (Number.isFinite(parsedAmount) && parsedAmount > 0) {
      refundData.amount = Math.round(parsedAmount);
    }

    if (reason) {
      refundData.reason = reason as Stripe.RefundCreateParams.Reason;
    }

    const refund = await stripe.refunds.create(refundData);

    res.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount ?? null,
      status: refund.status,
      paymentIntentId: resolvedPaymentIntentId,
      transactionId: orderPaymentInfo?.transactionId ?? null,
      transactionNumber: orderPaymentInfo?.transactionNumber ?? null,
      cardLast4: orderPaymentInfo?.cardLast4 ?? null,
      cardBrand: orderPaymentInfo?.cardBrand ?? null
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
 * Charge additional amount to saved payment method
 * POST /api/stripe/charge-saved
 */
router.post('/charge-saved', async (req, res) => {
  try {
    const { orderId, amount, description } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const paymentInfo = await getStripePaymentInfoForOrder(orderId);
    if (!paymentInfo) {
      return res.status(404).json({ error: 'No Stripe payment found for this order' });
    }

    const stripe = await paymentProviderFactory.getStripeClient();
    let paymentIntentCustomerId: string | null = null;
    let paymentIntentMethodId: string | null = paymentInfo.stripePaymentMethodId || null;
    let paymentMethodCardLast4 = paymentInfo.cardLast4 || null;
    let paymentMethodCardBrand = paymentInfo.cardBrand || null;

    const existingPaymentIntent = await stripe.paymentIntents.retrieve(paymentInfo.paymentIntentId, {
      expand: ['payment_method', 'customer']
    });

    if (!paymentIntentCustomerId) {
      const customer = existingPaymentIntent.customer;
      paymentIntentCustomerId = typeof customer === 'string' ? customer : customer?.id ?? null;
    }

    if (!paymentIntentMethodId) {
      const paymentMethod = existingPaymentIntent.payment_method;
      paymentIntentMethodId = typeof paymentMethod === 'string' ? paymentMethod : paymentMethod?.id ?? null;
      if (typeof paymentMethod === 'object' && paymentMethod?.card) {
        paymentMethodCardLast4 = paymentMethod.card.last4 || paymentMethodCardLast4;
        paymentMethodCardBrand = paymentMethod.card.brand || paymentMethodCardBrand;
      }
    }

    const stripeCustomerId = await resolveStripeCustomerId(
      paymentInfo.orderCustomerId,
      paymentIntentCustomerId
    );
    const paymentMethodId = await resolveStripePaymentMethodId(
      stripe,
      stripeCustomerId,
      paymentIntentMethodId || undefined
    );

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'No saved Stripe payment method available for this order' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parsedAmount),
      currency: 'cad',
      customer: stripeCustomerId || undefined,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      description: description || `Order adjustment for #${paymentInfo.orderNumber ?? orderId}`,
      metadata: {
        orderId,
        source: 'order-adjustment',
        originalPaymentIntentId: paymentInfo.paymentIntentId
      },
      expand: ['payment_method', 'latest_charge']
    });

    if (typeof paymentIntent.payment_method === 'object' && paymentIntent.payment_method?.card) {
      paymentMethodCardLast4 = paymentIntent.payment_method.card.last4 || paymentMethodCardLast4;
      paymentMethodCardBrand = paymentIntent.payment_method.card.brand || paymentMethodCardBrand;
    }

    res.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      cardLast4: paymentMethodCardLast4,
      cardBrand: paymentMethodCardBrand,
      stripeCustomerId,
      paymentMethodId
    });
  } catch (error) {
    console.error('❌ Charge saved card failed:', error);
    res.status(500).json({
      error: 'Failed to charge saved card',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Stripe webhook endpoint
 * POST /api/stripe/webhook
 */
router.post('/webhook', async (req, res) => {
  let event: Stripe.Event;

  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      console.error('❌ No Stripe signature found in webhook');
      return res.status(400).send('No signature found');
    }

    const stripe = await paymentProviderFactory.getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET is not configured');
      return res.status(500).send('Webhook secret not configured');
    }

    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
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
    const stripe = await paymentProviderFactory.getStripeClient();
    await stripe.balance.retrieve();
    
    res.json({
      success: true,
      service: 'Stripe',
      status: 'connected',
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
    const { phone, email, customerId } = req.body || {};

    if (!phone && !email && !customerId) {
      return res.status(400).json({
        success: false,
        error: 'Phone, email, or customerId is required.',
      });
    }

    let customer = null as any;
    if (customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
    } else {
      if (email) {
        customer = await prisma.customer.findFirst({
          where: {
            email: {
              equals: email,
              mode: 'insensitive',
            },
          },
        });
      }

      if (!customer && phone) {
        customer = await prisma.customer.findFirst({
          where: {
            phone: String(phone).replace(/\D/g, ''),
          },
        });
      }
    }

    if (!customer) {
      return res.json({
        success: true,
        customer: null,
        paymentMethods: [],
      });
    }

    // Fetch ALL linked Stripe customers (handles merged accounts with multiple Stripe IDs)
    const providerCustomers = await providerCustomerService.getAllProviderCustomers(customer.id, PaymentProvider.STRIPE);
    if (!providerCustomers || providerCustomers.length === 0) {
      return res.json({
        success: true,
        customer,
        paymentMethods: [],
      });
    }

    const stripe = await paymentProviderFactory.getStripeClient();
    const allMethods: Stripe.PaymentMethod[] = [];

    for (const pc of providerCustomers) {
      try {
        const methods = await stripe.paymentMethods.list({
          customer: pc.providerCustomerId,
          type: 'card',
        });
        allMethods.push(...methods.data);
      } catch (error: any) {
        if (error?.code === 'resource_missing' && error?.param === 'customer') {
          console.warn(`⚠️ Stripe customer missing: ${pc.providerCustomerId}. Deactivating link.`);
          await prisma.providerCustomer.update({
            where: { id: pc.id },
            data: { isActive: false, isPrimary: false, lastSyncAt: new Date() },
          });
          continue;
        }
        throw error;
      }
    }

    // Deduplicate by card fingerprint — same physical card may exist across multiple Stripe customers
    const seen = new Set<string>();
    const uniqueMethods = allMethods.filter((method) => {
      const fp = method.card?.fingerprint;
      if (!fp || seen.has(fp)) return false;
      seen.add(fp);
      return true;
    });

    res.json({
      success: true,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
      },
      paymentMethods: uniqueMethods.map((method) => ({
        id: method.id,
        type: method.card?.brand ?? 'card',
        brand: method.card?.brand ?? 'card',
        last4: method.card?.last4 ?? '',
        expMonth: method.card?.exp_month ?? 0,
        expYear: method.card?.exp_year ?? 0,
        fingerprint: method.card?.fingerprint ?? '',
      })),
    });
  } catch (error) {
    console.error('❌ Failed to get customer payment methods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment methods',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Create a Stripe SetupIntent for saving a card
 * POST /api/stripe/setup-intent
 */
router.post('/setup-intent', async (req, res) => {
  try {
    const { customerId } = req.body || {};

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID is required.',
      });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found.',
      });
    }

    if (!customer.email) {
      return res.status(400).json({
        success: false,
        error: 'Customer email is required.',
      });
    }

    const customerName = buildStripeCustomerName(
      [customer.firstName, customer.lastName].filter(Boolean).join(' '),
      customer.email
    );

    const { stripeCustomerId } = await providerCustomerService.getOrCreateStripeCustomer(customer.id, {
      email: customer.email,
      name: customerName,
      phone: customer.phone || undefined,
    });

    const stripe = await paymentProviderFactory.getStripeClient();
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
    });

    if (!setupIntent.client_secret) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create setup intent.',
      });
    }

    res.json({
      success: true,
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    console.error('❌ Failed to create Stripe setup intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create setup intent',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Detach a saved payment method from a Stripe customer
 * POST /api/stripe/customer/payment-methods/detach
 */
router.post('/customer/payment-methods/detach', async (req, res) => {
  try {
    const { paymentMethodId, customerId } = req.body || {};

    if (!paymentMethodId || !customerId) {
      return res.status(400).json({
        success: false,
        error: 'Payment method ID and customer ID are required.',
      });
    }

    const providerCustomers = await providerCustomerService.getAllProviderCustomers(
      customerId,
      PaymentProvider.STRIPE
    );

    if (!providerCustomers.length) {
      return res.status(404).json({
        success: false,
        error: 'No Stripe customer linked to this customer.',
      });
    }

    const allowedStripeCustomerIds = new Set(
      providerCustomers.map((providerCustomer) => providerCustomer.providerCustomerId)
    );

    const stripe = await paymentProviderFactory.getStripeClient();
    let paymentMethod: Stripe.PaymentMethod;
    try {
      paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error: any) {
      if (error?.code === 'resource_missing') {
        return res.status(404).json({
          success: false,
          error: 'Payment method not found.',
        });
      }
      throw error;
    }

    const attachedCustomerId =
      typeof paymentMethod.customer === 'string'
        ? paymentMethod.customer
        : paymentMethod.customer?.id;

    if (!attachedCustomerId || !allowedStripeCustomerIds.has(attachedCustomerId)) {
      return res.status(403).json({
        success: false,
        error: 'Payment method does not belong to this customer.',
      });
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    await prisma.customerPaymentMethod.deleteMany({
      where: {
        customerId,
        stripePaymentMethodId: paymentMethodId,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Failed to detach Stripe payment method:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detach payment method',
      details: error instanceof Error ? error.message : 'Unknown error',
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
