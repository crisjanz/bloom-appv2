import Stripe from 'stripe';

interface PaymentIntentData {
  amount: number; // Amount in dollars (will be converted to cents)
  currency?: string;
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  description?: string;
  metadata?: Record<string, string>;
  automatic_payment_methods?: {
    enabled: boolean;
  };
}

interface CustomerData {
  email?: string;
  name: string;
  phone?: string;
  metadata?: Record<string, string>;
}

class StripeService {
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-05-28.basil',
    });
  }

  /**
   * Create a payment intent for processing a payment
   */
  async createPaymentIntent(data: PaymentIntentData): Promise<Stripe.PaymentIntent> {
    try {
      let customerId = data.customerId;

      // Create/find customer if we have phone number (primary) or email
      if ((data.customerPhone || data.customerEmail) && !customerId) {
        const customer = await this.createCustomer({
          email: data.customerEmail,
          name: data.customerName || data.customerEmail?.split('@')[0] || 'Customer',
          phone: data.customerPhone,
        });
        customerId = customer.id;
        console.log(`✅ Created/found Stripe customer: ${customerId} for ${data.customerPhone || data.customerEmail}`);
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert dollars to cents
        currency: data.currency || 'cad',
        customer: customerId,
        description: data.description,
        metadata: data.metadata || {},
        automatic_payment_methods: data.automatic_payment_methods || { enabled: true },
        receipt_email: data.customerEmail,
        setup_future_usage: customerId ? 'off_session' : undefined, // Enable card saving if customer provided
      });

      console.log(`✅ Stripe PaymentIntent created: ${paymentIntent.id} for $${data.amount} (Customer: ${customerId || 'guest'})`);
      return paymentIntent;
    } catch (error) {
      console.error('❌ Stripe PaymentIntent creation failed:', error);
      throw error;
    }
  }

  /**
   * Confirm a payment intent (for server-side confirmation)
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      const confirmData: Stripe.PaymentIntentConfirmParams = {};
      
      if (paymentMethodId) {
        confirmData.payment_method = paymentMethodId;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        confirmData
      );

      console.log(`✅ Stripe PaymentIntent confirmed: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error) {
      console.error(`❌ Stripe PaymentIntent confirmation failed: ${paymentIntentId}`, error);
      throw error;
    }
  }

  /**
   * Retrieve a payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error(`❌ Failed to retrieve PaymentIntent: ${paymentIntentId}`, error);
      throw error;
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      console.log(`✅ Stripe PaymentIntent cancelled: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error) {
      console.error(`❌ Failed to cancel PaymentIntent: ${paymentIntentId}`, error);
      throw error;
    }
  }

  /**
   * Create or retrieve a Stripe customer
   */
  async createCustomer(data: CustomerData): Promise<Stripe.Customer> {
    try {
      let existingCustomer = null;

      // First, search by phone number if provided (primary identifier)
      if (data.phone) {
        const phoneCustomers = await this.stripe.customers.search({
          query: `phone:'${data.phone}'`,
          limit: 1,
        });
        if (phoneCustomers.data.length > 0) {
          existingCustomer = phoneCustomers.data[0];
        }
      }

      // If not found by phone, search by email as fallback
      if (!existingCustomer && data.email) {
        const emailCustomers = await this.stripe.customers.list({
          email: data.email,
          limit: 1,
        });
        if (emailCustomers.data.length > 0) {
          existingCustomer = emailCustomers.data[0];
        }
      }

      if (existingCustomer) {
        console.log(`✅ Found existing Stripe customer: ${existingCustomer.id} (${data.phone || data.email})`);
        return existingCustomer;
      }

      // Create new customer if none found
      const customer = await this.stripe.customers.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
        metadata: data.metadata || {},
      });

      console.log(`✅ Created new Stripe customer: ${customer.id} (${data.phone || data.email})`);
      return customer;
    } catch (error) {
      console.error('❌ Stripe Customer creation failed:', error);
      throw error;
    }
  }

  /**
   * Process a refund for a payment intent
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<Stripe.Refund> {
    try {
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert dollars to cents
      }

      if (reason) {
        refundData.reason = reason as Stripe.RefundCreateParams.Reason;
      }

      const refund = await this.stripe.refunds.create(refundData);
      
      const refundAmount = refund.amount ? (refund.amount / 100).toFixed(2) : 'full';
      console.log(`✅ Stripe refund processed: ${refund.id} for $${refundAmount}`);
      
      return refund;
    } catch (error) {
      console.error(`❌ Stripe refund failed for PaymentIntent: ${paymentIntentId}`, error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (error) {
      console.error('❌ Stripe webhook signature verification failed:', error);
      throw error;
    }
  }

  /**
   * Get payment method details
   */
  async getPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      return paymentMethod;
    } catch (error) {
      console.error(`❌ Failed to retrieve PaymentMethod: ${paymentMethodId}`, error);
      throw error;
    }
  }

  /**
   * Get saved payment methods for a customer
   */
  async getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      console.log(`✅ Retrieved ${paymentMethods.data.length} saved payment methods for customer: ${customerId}`);
      return paymentMethods.data;
    } catch (error) {
      console.error(`❌ Failed to retrieve payment methods for customer: ${customerId}`, error);
      throw error;
    }
  }

  /**
   * Find customer by phone or email
   */
  async findCustomerByContact(phone?: string, email?: string): Promise<Stripe.Customer | null> {
    try {
      let customer = null;

      // Search by phone first
      if (phone) {
        const phoneCustomers = await this.stripe.customers.search({
          query: `phone:'${phone}'`,
          limit: 1,
        });
        if (phoneCustomers.data.length > 0) {
          customer = phoneCustomers.data[0];
        }
      }

      // Search by email if not found by phone
      if (!customer && email) {
        const emailCustomers = await this.stripe.customers.list({
          email: email,
          limit: 1,
        });
        if (emailCustomers.data.length > 0) {
          customer = emailCustomers.data[0];
        }
      }

      return customer;
    } catch (error) {
      console.error('❌ Failed to find customer by contact:', error);
      return null;
    }
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple API call to verify connectivity
      await this.stripe.balance.retrieve();
      return true;
    } catch (error) {
      console.error('❌ Stripe health check failed:', error);
      return false;
    }
  }
}

export default new StripeService();