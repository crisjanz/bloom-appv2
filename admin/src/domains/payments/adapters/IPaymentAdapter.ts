/**
 * Payment Adapter Interface
 *
 * Defines the contract for all payment provider adapters.
 * Each adapter handles payment processing for specific payment method types.
 */

import {
  PaymentMethodType,
  PaymentProvider,
  PaymentMethodRequest,
  PaymentMethodResult
} from '../entities/Payment'

export interface IPaymentAdapter {
  /**
   * Process a payment using provider-specific logic
   *
   * @param transactionId - The transaction ID this payment belongs to
   * @param paymentMethod - The payment method details to process
   * @param customerId - The customer making the payment
   * @returns Result of the payment processing
   */
  processPayment(
    transactionId: string,
    paymentMethod: PaymentMethodRequest,
    customerId: string
  ): Promise<PaymentMethodResult>

  /**
   * Check if this adapter supports a specific payment method type
   *
   * @param paymentMethodType - The payment method type to check
   * @returns true if this adapter can process this payment method type
   */
  supports(paymentMethodType: PaymentMethodType): boolean

  /**
   * Get the payment provider this adapter represents
   *
   * @returns The payment provider enum value
   */
  getProvider(): PaymentProvider
}
