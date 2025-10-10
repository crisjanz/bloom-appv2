import { PrismaClient, PaymentProvider } from '@prisma/client';
import stripeService from './stripeService';

const prisma = new PrismaClient();

interface ProviderCustomerData {
  customerId: string;
  provider: PaymentProvider;
  providerCustomerId: string;
  providerEmail?: string;
  providerMetadata?: any;
}

interface CustomerLinkingOptions {
  email: string;
  name: string;
  phone?: string;
  metadata?: Record<string, string>;
}

class ProviderCustomerService {
  /**
   * Link a local customer to a payment provider customer
   */
  async linkCustomerToProvider(data: ProviderCustomerData) {
    try {
      const providerCustomer = await prisma.providerCustomer.create({
        data: {
          customerId: data.customerId,
          provider: data.provider,
          providerCustomerId: data.providerCustomerId,
          providerEmail: data.providerEmail,
          providerMetadata: data.providerMetadata,
          lastSyncAt: new Date(),
        },
        include: {
          customer: true,
        },
      });

      console.log(`✅ Linked customer ${data.customerId} to ${data.provider}: ${data.providerCustomerId}`);
      return providerCustomer;
    } catch (error) {
      console.error('❌ Failed to link customer to provider:', error);
      throw error;
    }
  }

  /**
   * Get provider customer by local customer ID and provider
   */
  async getProviderCustomer(customerId: string, provider: PaymentProvider) {
    try {
      const providerCustomer = await prisma.providerCustomer.findUnique({
        where: {
          customerId_provider: {
            customerId,
            provider,
          },
        },
        include: {
          customer: true,
        },
      });

      return providerCustomer;
    } catch (error) {
      console.error('❌ Failed to get provider customer:', error);
      throw error;
    }
  }

  /**
   * Get or create a Stripe customer for a local customer
   */
  async getOrCreateStripeCustomer(customerId: string, options: CustomerLinkingOptions) {
    try {
      // Check if customer is already linked to Stripe
      let providerCustomer = await this.getProviderCustomer(customerId, 'STRIPE');

      if (providerCustomer) {
        console.log(`✅ Found existing Stripe customer: ${providerCustomer.providerCustomerId}`);
        return {
          stripeCustomerId: providerCustomer.providerCustomerId,
          isNew: false,
        };
      }

      // Create new Stripe customer
      const stripeCustomer = await stripeService.createCustomer({
        email: options.email,
        name: options.name,
        phone: options.phone,
        metadata: {
          ...options.metadata,
          bloomCustomerId: customerId,
        },
      });

      // Link the customer
      providerCustomer = await this.linkCustomerToProvider({
        customerId,
        provider: 'STRIPE',
        providerCustomerId: stripeCustomer.id,
        providerEmail: stripeCustomer.email || undefined,
        providerMetadata: stripeCustomer,
      });

      console.log(`✅ Created and linked new Stripe customer: ${stripeCustomer.id}`);
      return {
        stripeCustomerId: stripeCustomer.id,
        isNew: true,
      };
    } catch (error) {
      console.error('❌ Failed to get or create Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Get or create a Square customer for a local customer
   */
  async getOrCreateSquareCustomer(customerId: string, options: CustomerLinkingOptions) {
    try {
      // Check if customer is already linked to Square
      let providerCustomer = await this.getProviderCustomer(customerId, 'SQUARE');

      if (providerCustomer) {
        console.log(`✅ Found existing Square customer: ${providerCustomer.providerCustomerId}`);
        return {
          squareCustomerId: providerCustomer.providerCustomerId,
          isNew: false,
        };
      }

      // TODO: Implement Square customer creation when Square service is ready
      console.log('⚠️ Square customer creation not yet implemented');
      return {
        squareCustomerId: null,
        isNew: false,
      };
    } catch (error) {
      console.error('❌ Failed to get or create Square customer:', error);
      throw error;
    }
  }

  /**
   * Update provider customer metadata
   */
  async updateProviderCustomerMetadata(
    customerId: string,
    provider: PaymentProvider,
    metadata: any
  ) {
    try {
      const providerCustomer = await prisma.providerCustomer.update({
        where: {
          customerId_provider: {
            customerId,
            provider,
          },
        },
        data: {
          providerMetadata: metadata,
          lastSyncAt: new Date(),
        },
      });

      console.log(`✅ Updated ${provider} customer metadata for customer ${customerId}`);
      return providerCustomer;
    } catch (error) {
      console.error('❌ Failed to update provider customer metadata:', error);
      throw error;
    }
  }

  /**
   * Get all provider customers for a local customer
   */
  async getAllProviderCustomers(customerId: string) {
    try {
      const providerCustomers = await prisma.providerCustomer.findMany({
        where: {
          customerId,
          isActive: true,
        },
        include: {
          customer: true,
        },
      });

      return providerCustomers;
    } catch (error) {
      console.error('❌ Failed to get provider customers:', error);
      throw error;
    }
  }

  /**
   * Deactivate provider customer link
   */
  async deactivateProviderCustomer(customerId: string, provider: PaymentProvider) {
    try {
      const providerCustomer = await prisma.providerCustomer.update({
        where: {
          customerId_provider: {
            customerId,
            provider,
          },
        },
        data: {
          isActive: false,
        },
      });

      console.log(`✅ Deactivated ${provider} customer link for customer ${customerId}`);
      return providerCustomer;
    } catch (error) {
      console.error('❌ Failed to deactivate provider customer:', error);
      throw error;
    }
  }

  /**
   * Sync customer data with payment provider
   */
  async syncCustomerWithProvider(customerId: string, provider: PaymentProvider) {
    try {
      const providerCustomer = await this.getProviderCustomer(customerId, provider);
      
      if (!providerCustomer) {
        throw new Error(`Customer ${customerId} not linked to ${provider}`);
      }

      if (provider === 'STRIPE') {
        // Fetch latest data from Stripe
        const stripeCustomer = await stripeService.createCustomer({
          email: providerCustomer.customer.email || '',
          name: `${providerCustomer.customer.firstName} ${providerCustomer.customer.lastName}`,
          phone: providerCustomer.customer.phone || undefined,
        });

        // Update local metadata
        await this.updateProviderCustomerMetadata(
          customerId,
          provider,
          stripeCustomer
        );

        console.log(`✅ Synced customer ${customerId} with Stripe`);
      }
      // TODO: Add Square sync when Square service is ready

      return providerCustomer;
    } catch (error) {
      console.error(`❌ Failed to sync customer with ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get customer payment history across all providers
   */
  async getCustomerPaymentHistory(customerId: string) {
    try {
      const providerCustomers = await this.getAllProviderCustomers(customerId);
      
      const paymentHistory: {
        stripe: any;
        square: any;
        total_providers: number;
      } = {
        stripe: null,
        square: null,
        total_providers: providerCustomers.length,
      };

      for (const pc of providerCustomers) {
        if (pc.provider === 'STRIPE') {
          paymentHistory.stripe = {
            customerId: pc.providerCustomerId,
            email: pc.providerEmail || undefined,
            linkedAt: pc.createdAt,
            lastSync: pc.lastSyncAt,
          };
        } else if (pc.provider === 'SQUARE') {
          paymentHistory.square = {
            customerId: pc.providerCustomerId,
            linkedAt: pc.createdAt,
            lastSync: pc.lastSyncAt,
          };
        }
      }

      return paymentHistory;
    } catch (error) {
      console.error('❌ Failed to get customer payment history:', error);
      throw error;
    }
  }
}

export default new ProviderCustomerService();