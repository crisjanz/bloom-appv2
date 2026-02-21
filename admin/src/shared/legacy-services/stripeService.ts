import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';

const STRIPE_PUBLISHABLE_KEY = 'pk_test_51OajyeBxoCAP8QMVXISVMPyaGSPtIF01InLULkiURi6zqSo5FPJCmlknmW1gHRCxDJasvYVSAjQVoVMyrzEAEpz3006LEMl30Z';

interface PaymentIntentRequest {
  amount: number;
  currency?: string;
  customerId?: string;
  bloomCustomerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  description?: string;
  orderIds?: string[];
  metadata?: Record<string, string>;
}

interface PaymentIntentResponse {
  success: boolean;
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  cardFingerprint?: string;
  cardLast4?: string;
  cardBrand?: string;
  error?: string;
}

interface CustomerRequest {
  email: string;
  name: string;
  phone?: string;
  metadata?: Record<string, string>;
}

interface CustomerResponse {
  success: boolean;
  customerId: string;
  email: string;
  name: string;
  error?: string;
}

interface RefundRequest {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}

interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number | null;
  status: string;
  error?: string;
}

class StripeService {
  private stripePromise: Promise<Stripe | null>;
  private baseUrl: string;

  constructor() {
    this.stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
    const apiBase = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
    this.baseUrl = apiBase ? `${apiBase}/api/stripe` : '/api/stripe';
  }

  /**
   * Get Stripe instance
   */
  getStripe(): Promise<Stripe | null> {
    return this.stripePromise;
  }

  /**
   * Create Elements options for Stripe Elements
   */
  getElementsOptions(clientSecret: string): StripeElementsOptions {
    return {
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#597485',
          colorBackground: '#ffffff',
          colorText: '#1f2937',
          colorDanger: '#ef4444',
          fontFamily: 'Inter, system-ui, sans-serif',
          borderRadius: '12px',
        },
      },
    };
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(data: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const result = await response.json();
      console.log('✅ Payment intent created:', result.paymentIntentId);
      
      return result;
    } catch (error) {
      console.error('❌ Payment intent creation failed:', error);
      throw error;
    }
  }

  /**
   * Confirm payment intent (server-side)
   */
  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/payment-intent/${paymentIntentId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const detail = errorData.details || errorData.error || 'Failed to confirm payment intent';
        const code = errorData.code ? ` (${errorData.code})` : '';
        throw new Error(`${detail}${code}`);
      }

      const result = await response.json();
      console.log('✅ Payment intent confirmed:', paymentIntentId);
      
      return result;
    } catch (error) {
      console.error('❌ Payment intent confirmation failed:', error);
      throw error;
    }
  }

  /**
   * Create or retrieve Stripe customer
   */
  async createCustomer(data: CustomerRequest): Promise<CustomerResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create customer');
      }

      const result = await response.json();
      console.log('✅ Stripe customer created/retrieved:', result.customerId);
      
      return result;
    } catch (error) {
      console.error('❌ Stripe customer creation failed:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(data: RefundRequest): Promise<RefundResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process refund');
      }

      const result = await response.json();
      console.log('✅ Stripe refund processed:', result.refundId);
      
      return result;
    } catch (error) {
      console.error('❌ Stripe refund failed:', error);
      throw error;
    }
  }

  /**
   * Get saved payment methods for a customer
   */
  async getCustomerPaymentMethods(phone?: string, email?: string, customerId?: string): Promise<{
    success: boolean;
    customer: any;
    paymentMethods: Array<{
      id: string;
      customerId?: string | null;
      type: string;
      brand?: string;
      last4: string;
      expMonth: number;
      expYear: number;
    }>;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/customer/payment-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, email, customerId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get payment methods');
      }

      const result = await response.json();
      console.log(`✅ Retrieved ${result.paymentMethods.length} saved payment methods`);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to get customer payment methods:', error);
      return {
        success: false,
        customer: null,
        paymentMethods: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get saved payment methods for Square customers
   */
  async getSquareCustomerPaymentMethods(phone?: string, email?: string): Promise<{
    success: boolean;
    customer: any;
    paymentMethods: Array<{
      id: string;
      type: string;
      last4: string;
      expMonth: number;
      expYear: number;
    }>;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/square/customer/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get Square payment methods');
      }

      const result = await response.json();
      console.log(`✅ Retrieved ${result.paymentMethods.length} saved Square payment methods`);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to get Square customer payment methods:', error);
      return {
        success: false,
        customer: null,
        paymentMethods: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process payment with saved Square card
   */
  async processSquareSavedCardPayment(data: {
    amount: number;
    customerId: string;
    customerCardId: string;
    description?: string;
    orderIds?: string[];
  }): Promise<any> {
    try {
      const response = await fetch('/api/square/payment/saved-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: data.amount,
          currency: 'CAD',
          customerId: data.customerId,
          customerCardId: data.customerCardId,
          description: data.description,
          orderIds: data.orderIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process Square saved card payment');
      }

      const result = await response.json();
      console.log('✅ Square saved card payment processed:', result.paymentId);
      
      return result;
    } catch (error) {
      console.error('❌ Square saved card payment failed:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const result = await response.json();
      
      return result.success && result.status === 'connected';
    } catch (error) {
      console.error('❌ Stripe health check failed:', error);
      return false;
    }
  }

  /**
   * Helper method to handle payment confirmation on frontend
   */
  async handlePaymentConfirmation(
    stripe: Stripe,
    elements: any,
    clientSecret: string
  ): Promise<{ success: boolean; error?: string; paymentIntent?: any }> {
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders`, // Redirect after payment
        },
        redirect: 'if_required', // Only redirect if required by payment method
      });

      if (error) {
        console.error('❌ Payment confirmation failed:', error);
        return { success: false, error: error.message };
      }

      if (paymentIntent.status === 'succeeded') {
        console.log('✅ Payment succeeded:', paymentIntent.id);
        return { success: true, paymentIntent };
      }

      return { success: false, error: 'Payment not completed' };
    } catch (error) {
      console.error('❌ Payment confirmation error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment confirmation failed' 
      };
    }
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency = 'CAD'): string {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Validate payment amount
   */
  validateAmount(amount: number): { valid: boolean; error?: string } {
    if (!amount || amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    if (amount < 0.50) {
      return { valid: false, error: 'Minimum payment amount is $0.50' };
    }

    if (amount > 999999.99) {
      return { valid: false, error: 'Maximum payment amount is $999,999.99' };
    }

    return { valid: true };
  }
}

export default new StripeService();
