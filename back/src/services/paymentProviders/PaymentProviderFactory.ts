import Stripe from 'stripe';
import { PaymentProvider } from '@prisma/client';
import { decryptSecret } from '../../utils/crypto';
import { fetchPaymentSettings, getSettingsRecord } from '../paymentSettingsService';

class PaymentProviderFactory {
  private stripeInstance: Stripe | null = null;
  private squareInstance: any | null = null;
  private lastSettingsCheck = 0;
  private readonly cacheDurationMs = 5 * 60 * 1000;

  /**
   * Get Stripe client instance (lazy initialization)
   * Reads credentials from database settings
   */
  async getStripeClient(): Promise<Stripe> {
    const now = Date.now();
    if (this.stripeInstance && now - this.lastSettingsCheck < this.cacheDurationMs) {
      return this.stripeInstance;
    }

    const settings = await fetchPaymentSettings();
    const stripeConfig = settings.providers.stripe;

    if (!stripeConfig.enabled) {
      throw new Error('Stripe is not enabled in payment settings');
    }

    if (!stripeConfig.hasSecret) {
      throw new Error('Stripe secret key not configured');
    }

    const settingsRecord = await getSettingsRecord();
    const encryptedSecret = settingsRecord?.stripeSecretKey;
    if (!encryptedSecret) {
      throw new Error('Stripe secret key not found in database');
    }

    const secretKey = decryptSecret(encryptedSecret);
    if (!secretKey) {
      throw new Error('Failed to decrypt Stripe secret key');
    }

    this.stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-05-28.basil',
    });
    this.lastSettingsCheck = now;

    console.log(`Stripe client initialized (mode: ${stripeConfig.mode})`);
    return this.stripeInstance;
  }

  /**
   * Invalidate cached provider clients
   */
  invalidateCache(): void {
    this.stripeInstance = null;
    this.squareInstance = null;
    this.lastSettingsCheck = 0;
    console.log('Payment provider cache invalidated');
  }

  /**
   * Get Square client (future implementation)
   */
  async getSquareClient(): Promise<any> {
    throw new Error('Square client not yet implemented');
  }

  /**
   * Get active card payment provider
   */
  async getActiveCardProvider(): Promise<{ provider: PaymentProvider; client: any }> {
    const settings = await fetchPaymentSettings();
    const defaultProvider = settings.defaultCardProvider || PaymentProvider.STRIPE;

    switch (defaultProvider) {
      case PaymentProvider.STRIPE:
        return {
          provider: PaymentProvider.STRIPE,
          client: await this.getStripeClient(),
        };
      case PaymentProvider.SQUARE:
        return {
          provider: PaymentProvider.SQUARE,
          client: await this.getSquareClient(),
        };
      default:
        throw new Error(`Unsupported payment provider: ${defaultProvider}`);
    }
  }
}

export default new PaymentProviderFactory();
