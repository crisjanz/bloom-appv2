/**
 * Square Payment Adapter
 *
 * Handles credit/debit card payments via Square.
 * Uses the existing stripeService for saved card payments and backend API for nonces.
 *
 * Extracted from PaymentService.ts lines 286-310
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

export class SquarePaymentAdapter implements IPaymentAdapter {
  supports(type: PaymentMethodType): boolean {
    // Square handles card payments (CARD, CREDIT, DEBIT)
    return type === PaymentMethodType.CARD ||
           type === PaymentMethodType.CREDIT ||
           type === PaymentMethodType.DEBIT
  }

  getProvider(): PaymentProvider {
    return PaymentProvider.SQUARE
  }

  async processPayment(
    transactionId: string,
    paymentMethod: PaymentMethodRequest,
    customerId: string
  ): Promise<PaymentMethodResult> {
    // COPIED EXACTLY FROM PaymentService.ts lines 286-310 (processSquarePayment)
    try {
      let result

      // Check if this is a saved card payment (customerCardId)
      if (paymentMethod.cardDetails?.token?.startsWith('card-')) {
        // ✅ USE EXISTING SERVICE - Saved card payment
        result = await stripeService.processSquareSavedCardPayment({
          amount: paymentMethod.amount.amount,
          customerId,
          customerCardId: paymentMethod.cardDetails.token,
          description: `Transaction ${transactionId}`
        })

        return {
          type: paymentMethod.type,
          provider: PaymentProvider.SQUARE,
          amount: paymentMethod.amount,
          status: result.success ? PaymentMethodStatus.CAPTURED : PaymentMethodStatus.FAILED,
          providerTransactionId: result.paymentId,
          authorizationCode: result.authCode || 'SQ_AUTH_PENDING',
          errorCode: result.error ? 'SQUARE_SAVED_CARD_ERROR' : undefined,
          errorMessage: result.error
        }
      } else {
        // Direct payment with nonce - backend API call
        const response = await fetch('/api/square/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: paymentMethod.amount.amount,
            currency: 'CAD',
            sourceId: paymentMethod.cardDetails?.token,
            customerId,
            description: `Transaction ${transactionId}`
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Square payment failed')
        }

        result = await response.json()

        return {
          type: paymentMethod.type,
          provider: PaymentProvider.SQUARE,
          amount: paymentMethod.amount,
          status: result.success ? PaymentMethodStatus.CAPTURED : PaymentMethodStatus.FAILED,
          providerTransactionId: result.payment?.id || result.paymentId,
          authorizationCode: result.payment?.authorization_code || 'SQ_AUTH_PENDING',
          errorCode: result.error ? 'SQUARE_PAYMENT_ERROR' : undefined,
          errorMessage: result.error
        }
      }
    } catch (error) {
      console.error('Square payment processing error:', error)
      return {
        type: paymentMethod.type,
        provider: PaymentProvider.SQUARE,
        amount: paymentMethod.amount,
        status: PaymentMethodStatus.FAILED,
        errorCode: 'SQUARE_API_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Square API call failed'
      }
    }
  }
}
