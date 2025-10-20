/**
 * Gift Card & Store Credit Adapter
 *
 * Handles gift card and store credit payments (combined discount system).
 * Uses the existing giftCardService for redemption.
 *
 * Extracted from PaymentService.ts lines 347-369
 */

import { redeemGiftCard } from '../../../shared/legacy-services/giftCardService'
import { IPaymentAdapter } from './IPaymentAdapter'
import {
  PaymentMethodType,
  PaymentProvider,
  PaymentMethodRequest,
  PaymentMethodResult,
  PaymentMethodStatus
} from '../entities/Payment'

export class GiftCardStoreCreditAdapter implements IPaymentAdapter {
  supports(type: PaymentMethodType): boolean {
    // Handles gift cards and store credit (combined discount system)
    return type === PaymentMethodType.GIFT_CARD ||
           type === PaymentMethodType.STORE_CREDIT
  }

  getProvider(): PaymentProvider {
    return PaymentProvider.GIFT_CARD
  }

  async processPayment(
    transactionId: string,
    paymentMethod: PaymentMethodRequest,
    customerId: string
  ): Promise<PaymentMethodResult> {
    // COPIED EXACTLY FROM PaymentService.ts lines 347-369 (processGiftCardPayment)
    try {
      // ✅ USE EXISTING SERVICE - Redeem gift card
      const result = await redeemGiftCard(
        paymentMethod.giftCardDetails?.cardNumber || '',
        paymentMethod.amount.amount,
        transactionId
      )

      return {
        type: PaymentMethodType.GIFT_CARD,
        provider: PaymentProvider.GIFT_CARD,
        amount: paymentMethod.amount,
        status: result.success ? PaymentMethodStatus.CAPTURED : PaymentMethodStatus.FAILED,
        providerTransactionId: result.transactionId,
        errorCode: result.error ? 'GIFT_CARD_ERROR' : undefined,
        errorMessage: result.error
      }
    } catch (error) {
      console.error('Gift card processing error:', error)
      return {
        type: PaymentMethodType.GIFT_CARD,
        provider: PaymentProvider.GIFT_CARD,
        amount: paymentMethod.amount,
        status: PaymentMethodStatus.FAILED,
        errorCode: 'GIFT_CARD_PROCESSING_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Gift card processing failed'
      }
    }
  }
}
