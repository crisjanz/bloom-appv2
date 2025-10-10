// Square Service - Simplified version for testing
// Note: Square Connect SDK is deprecated, this is a basic implementation

interface PaymentData {
  amount: number; // Amount in dollars
  currency?: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
  sourceId: string; // Payment source (card nonce, etc.)
}

interface CustomerData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
  metadata?: Record<string, string>;
}

interface SquareCustomer {
  id: string;
  created_at?: string;
  updated_at?: string;
  given_name?: string;
  family_name?: string;
  company_name?: string;
  nickname?: string;
  email_address?: string;
  phone_number?: string;
  note?: string;
  reference_id?: string;
  cards?: SquareCard[];
}

interface SquareCard {
  id: string;
  card_brand?: string;
  last_4?: string;
  exp_month?: number;
  exp_year?: number;
  cardholder_name?: string;
  billing_address?: any;
  fingerprint?: string;
  customer_id?: string;
  merchant_id?: string;
}

class SquareService {
  private accessToken: string;
  private locationId: string;
  private baseUrl: string;

  constructor() {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;

    if (!accessToken) {
      throw new Error('SQUARE_ACCESS_TOKEN environment variable is required');
    }

    if (!locationId) {
      throw new Error('SQUARE_LOCATION_ID environment variable is required');
    }

    this.accessToken = accessToken;
    this.locationId = locationId;
    this.baseUrl = 'https://connect.squareupsandbox.com/v2'; // Sandbox URL
  }

  /**
   * Make authenticated request to Square API
   */
  private async makeRequest(endpoint: string, method: string = 'GET', body?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: any = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2021-06-16', // Square API version
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Square API error: ${response.status} - ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Create a payment (handles both real and mock nonces)
   */
  async createPayment(data: PaymentData) {
    try {
      // Handle mock nonces for testing (frontend sends these)
      if (data.sourceId.includes('card-nonce-ok')) {
        // Use Square's sandbox test nonce for successful payments
        data.sourceId = 'cnon:card-nonce-ok';
      } else if (data.sourceId.includes('card-nonce-decline')) {
        // Use Square's sandbox test nonce for declined payments
        data.sourceId = 'cnon:card-nonce-declined';
      }

      const requestBody: any = {
        source_id: data.sourceId,
        amount_money: {
          amount: Math.round(data.amount * 100), // Convert dollars to cents
          currency: data.currency || 'CAD',
        },
        location_id: this.locationId,
        note: data.description,
        idempotency_key: `${Date.now()}_${Math.random()}`,
        // Removed reference_id to prevent automatic order creation
      };

      // Add customer ID if provided
      if (data.customerId) {
        requestBody.customer_id = data.customerId;
        console.log(`🔗 Linking payment to Square customer: ${data.customerId}`);
      }

      const result = await this.makeRequest('/payments', 'POST', requestBody);
      
      console.log(`✅ Square payment created: ${result.payment?.id} for $${data.amount}`);
      return result.payment;
    } catch (error) {
      console.error('❌ Square payment creation failed:', error);
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string) {
    try {
      const result = await this.makeRequest(`/payments/${paymentId}`);
      return result.payment;
    } catch (error) {
      console.error(`❌ Failed to retrieve Square payment: ${paymentId}`, error);
      throw error;
    }
  }

  /**
   * Create a refund
   */
  async createRefund(paymentId: string, amount?: number, reason?: string) {
    try {
      const requestBody: any = {
        idempotency_key: `refund_${Date.now()}_${Math.random()}`,
        payment_id: paymentId,
        reason: reason || 'Customer refund request',
      };

      if (amount) {
        requestBody.amount_money = {
          amount: Math.round(amount * 100),
          currency: 'CAD',
        };
      }

      const result = await this.makeRequest('/refunds', 'POST', requestBody);
      
      const refundAmount = result.refund?.amount_money?.amount 
        ? result.refund.amount_money.amount / 100 
        : 'full';
      
      console.log(`✅ Square refund processed: ${result.refund?.id} for $${refundAmount}`);
      return result.refund;
    } catch (error) {
      console.error(`❌ Square refund failed for payment: ${paymentId}`, error);
      throw error;
    }
  }

  /**
   * Create or retrieve a Square customer
   */
  async createCustomer(data: CustomerData) {
    try {
      // Build request body, only including fields that have values
      const requestBody: any = {
        reference_id: `bloom_customer_${Date.now()}`,
      };

      if (data.firstName) requestBody.given_name = data.firstName;
      if (data.lastName) requestBody.family_name = data.lastName;
      if (data.email) requestBody.email_address = data.email;
      if (data.phone) requestBody.phone_number = data.phone;
      if (data.companyName) requestBody.company_name = data.companyName;

      console.log('🔄 Creating Square customer with data:', requestBody);

      const result = await this.makeRequest('/customers', 'POST', requestBody);
      
      console.log(`✅ Created new Square customer: ${result.customer?.id}`, result.customer);
      return result.customer;
    } catch (error) {
      console.error('❌ Square customer creation failed:', error);
      console.error('Request body was:', {
        given_name: data.firstName,
        family_name: data.lastName,
        email_address: data.email,
        phone_number: data.phone,
      });
      throw error;
    }
  }

  /**
   * Create a terminal checkout for Square Reader
   */
  async createTerminalCheckout(amount: number, description?: string, deviceId?: string) {
    try {
      const requestBody = {
        idempotency_key: `terminal_${Date.now()}_${Math.random()}`,
        checkout: {
          amount_money: {
            amount: Math.round(amount * 100),
            currency: 'CAD',
          },
          device_options: {
            device_id: deviceId || 'TERMINAL_DEVICE_ID', // Replace with actual device ID
            skip_receipt_screen: false,
            collect_signature: true,
          },
          note: description || 'Bloom Flower Shop Purchase',
          payment_type: 'CARD_PRESENT',
        },
      };

      const result = await this.makeRequest('/terminal/checkouts', 'POST', requestBody);
      
      console.log(`✅ Square terminal checkout created: ${result.checkout?.id}`);
      return result.checkout;
    } catch (error) {
      console.error('❌ Square terminal checkout failed:', error);
      throw error;
    }
  }

  /**
   * Get terminal checkout status
   */
  async getTerminalCheckout(checkoutId: string) {
    try {
      const result = await this.makeRequest(`/terminal/checkouts/${checkoutId}`);
      return result.checkout;
    } catch (error) {
      console.error(`❌ Failed to get Square terminal checkout: ${checkoutId}`, error);
      throw error;
    }
  }

  /**
   * Cancel terminal checkout
   */
  async cancelTerminalCheckout(checkoutId: string) {
    try {
      const result = await this.makeRequest(`/terminal/checkouts/${checkoutId}/cancel`, 'POST');
      console.log(`✅ Square terminal checkout cancelled: ${checkoutId}`);
      return result.checkout;
    } catch (error) {
      console.error(`❌ Failed to cancel Square terminal checkout: ${checkoutId}`, error);
      throw error;
    }
  }

  /**
   * Find customer by phone or email
   */
  async findCustomerByContact(phone?: string, email?: string): Promise<SquareCustomer | null> {
    try {
      let customer = null;

      // Search by phone first
      if (phone) {
        console.log(`🔍 Searching for Square customer by phone: ${phone}`);
        const phoneResults = await this.makeRequest('/customers/search', 'POST', {
          filter: {
            phone_number: {
              exact: phone
            }
          }
        });
        console.log(`📞 Phone search results:`, {
          searchPhone: phone,
          customersFound: phoneResults.customers?.length || 0,
          customers: phoneResults.customers?.map((c: SquareCustomer) => ({
            id: c.id,
            name: `${c.given_name || ''} ${c.family_name || ''}`.trim(),
            phone: c.phone_number,
            email: c.email_address
          }))
        });
        
        if (phoneResults.customers && phoneResults.customers.length > 0) {
          customer = phoneResults.customers[0];
        }
      }

      // Search by email if not found by phone
      if (!customer && email) {
        console.log(`🔍 Searching for Square customer by email: ${email}`);
        const emailResults = await this.makeRequest('/customers/search', 'POST', {
          filter: {
            email_address: {
              exact: email
            }
          }
        });
        console.log(`📧 Email search results:`, {
          searchEmail: email,
          customersFound: emailResults.customers?.length || 0,
          customers: emailResults.customers?.map((c: SquareCustomer) => ({
            id: c.id,
            name: `${c.given_name || ''} ${c.family_name || ''}`.trim(),
            phone: c.phone_number,
            email: c.email_address
          }))
        });
        
        if (emailResults.customers && emailResults.customers.length > 0) {
          customer = emailResults.customers[0];
        }
      }

      return customer;
    } catch (error) {
      console.error('❌ Failed to find Square customer by contact:', error);
      return null;
    }
  }

  /**
   * Get saved payment methods (cards) for a customer
   */
  async getCustomerCards(customerId: string): Promise<SquareCard[]> {
    try {
      // Square uses a different endpoint for customer cards
      const result = await this.makeRequest(`/customers/${customerId}`, 'GET');
      const cards = result.customer?.cards || [];
      console.log(`✅ Retrieved ${cards.length} saved cards for Square customer: ${customerId}`);
      return cards;
    } catch (error) {
      console.error(`❌ Failed to retrieve cards for Square customer: ${customerId}`, error);
      return [];
    }
  }

  /**
   * Create a card on file for a customer
   */
  async createCustomerCard(customerId: string, cardNonce: string): Promise<any> {
    try {
      // In Square, card nonces are single-use and get consumed during payment
      // For testing, we'll use the actual Square Cards API endpoint
      const result = await this.makeRequest('/cards', 'POST', {
        idempotency_key: `card_${Date.now()}_${Math.random()}`,
        source_id: cardNonce,
        card: {
          customer_id: customerId
        }
      });
      
      console.log(`✅ Created card on file for Square customer: ${customerId}`);
      return result.card;
    } catch (error) {
      console.error(`❌ Failed to create card for Square customer: ${customerId}`, error);
      
      // For sandbox testing, if the nonce is already used, that's expected
      if (error instanceof Error && error.message.includes('card_nonce')) {
        console.log(`ℹ️ Card nonce already used in payment - this is expected in sandbox`);
        return null; // Don't throw error for this expected case
      }
      
      throw error;
    }
  }

  /**
   * Process payment with saved card
   */
  async createPaymentWithSavedCard(data: {
    amount: number;
    currency?: string;
    customerId: string;
    customerCardId: string;
    description?: string;
  }) {
    try {
      const requestBody = {
        source_id: data.customerCardId,
        amount_money: {
          amount: Math.round(data.amount * 100), // Convert dollars to cents
          currency: data.currency || 'CAD',
        },
        location_id: this.locationId,
        note: data.description,
        reference_id: `bloom_saved_${Date.now()}`,
        idempotency_key: `${Date.now()}_${Math.random()}`,
      };

      const result = await this.makeRequest('/payments', 'POST', requestBody);
      
      console.log(`✅ Square payment with saved card: ${result.payment?.id} for $${data.amount}`);
      return result.payment;
    } catch (error) {
      console.error('❌ Square payment with saved card failed:', error);
      throw error;
    }
  }

  /**
   * Enhanced customer creation that also handles finding existing customers
   */
  async createOrFindCustomer(data: CustomerData) {
    try {
      // First try to find existing customer
      const existingCustomer = await this.findCustomerByContact(data.phone, data.email);
      if (existingCustomer) {
        console.log(`✅ Found existing Square customer: ${existingCustomer.id} (${data.phone || data.email})`);
        return existingCustomer;
      }

      // Create new customer if none found
      return await this.createCustomer(data);
    } catch (error) {
      console.error('❌ Square customer creation/finding failed:', error);
      throw error;
    }
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple API call to verify connectivity - get location info
      const result = await this.makeRequest(`/locations/${this.locationId}`);
      return !!result.location;
    } catch (error) {
      console.error('❌ Square health check failed:', error);
      return false;
    }
  }

  /**
   * Get location information
   */
  async getLocation() {
    try {
      const result = await this.makeRequest(`/locations/${this.locationId}`);
      return result.location;
    } catch (error) {
      console.error('❌ Failed to get Square location:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature (placeholder)
   */
  verifyWebhookSignature(payload: string, signature: string, signatureKey: string): boolean {
    try {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', signatureKey);
      hmac.update(payload);
      const expectedSignature = hmac.digest('base64');
      
      return expectedSignature === signature;
    } catch (error) {
      console.error('❌ Square webhook signature verification failed:', error);
      return false;
    }
  }
}

export default new SquareService();