/**
 * Stripe Payment Adapter
 *
 * Handles credit/debit card payments via Stripe.
 * Uses the existing stripeService for all Stripe API interactions.
 *
 * Extracted from PaymentService.ts lines 245-281
 */

import stripeService from '../../../shared/legacy-services/stripeService'
import { IPaymentAdapter } from './IPaymentAdapter'
import {
  PaymentMethodType,
  PaymentProvider,
  PaymentMethodRequest,
  PaymentMethodResult,
  PaymentMethodStatus
} from '../entities/Payment'

export class StripePaymentAdapter implements IPaymentAdapter {
  supports(type: PaymentMethodType): boolean {
    // Stripe handles card payments (CARD, CREDIT, DEBIT)
    return type === PaymentMethodType.CARD ||
           type === PaymentMethodType.CREDIT ||
           type === PaymentMethodType.DEBIT
  }

  getProvider(): PaymentProvider {
    return PaymentProvider.STRIPE
  }

  async processPayment(
    transactionId: string,
    paymentMethod: PaymentMethodRequest,
    customerId: string
  ): Promise<PaymentMethodResult> {
    // COPIED EXACTLY FROM PaymentService.ts lines 245-281 (processStripePayment)
    try {
      if (!paymentMethod.cardDetails?.paymentMethodId) {
        throw new Error('Stripe payment method ID required')
      }

      // ✅ USE EXISTING SERVICE - Create payment intent
      const paymentIntentResult = await stripeService.createPaymentIntent({
        amount: paymentMethod.amount.amount,
        customerId,
        metadata: { transactionId }
      })

      if (!paymentIntentResult.success) {
        return {
          type: paymentMethod.type,
          provider: PaymentProvider.STRIPE,
          amount: paymentMethod.amount,
          status: PaymentMethodStatus.FAILED,
          errorCode: 'PAYMENT_INTENT_FAILED',
          errorMessage: paymentIntentResult.error || 'Failed to create payment intent'
        }
      }

      // ✅ USE EXISTING SERVICE - Confirm payment intent
      const confirmResult = await stripeService.confirmPaymentIntent(
        paymentIntentResult.paymentIntentId,
        paymentMethod.cardDetails.paymentMethodId
      )

      // Extract card details from confirmation result
      const cardLast4 = confirmResult.payment_method?.card?.last4 || '****'
      const cardBrand = confirmResult.payment_method?.card?.brand || 'unknown'

      return {
        type: paymentMethod.type,
        provider: PaymentProvider.STRIPE,
        amount: paymentMethod.amount,
        status: confirmResult.status === 'succeeded' ? PaymentMethodStatus.CAPTURED : PaymentMethodStatus.FAILED,
        providerTransactionId: confirmResult.id,
        authorizationCode: confirmResult.charges?.data?.[0]?.authorization_code || 'AUTH_PENDING',
        errorCode: confirmResult.status !== 'succeeded' ? 'PAYMENT_FAILED' : undefined,
        errorMessage: confirmResult.status !== 'succeeded'
          ? `Payment status: ${confirmResult.status}`
          : undefined,
        receiptData: confirmResult.status === 'succeeded' ? {
          cardLast4,
          cardBrand,
          authCode: confirmResult.charges?.data?.[0]?.authorization_code || 'AUTH_PENDING',
          transactionId: confirmResult.id
        } : undefined
      }
    } catch (error) {
      console.error('Stripe payment processing error:', error)
      return {
        type: paymentMethod.type,
        provider: PaymentProvider.STRIPE,
        amount: paymentMethod.amount,
        status: PaymentMethodStatus.FAILED,
        errorCode: 'STRIPE_PROCESSING_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Stripe payment processing failed'
      }
    }
  }
}
