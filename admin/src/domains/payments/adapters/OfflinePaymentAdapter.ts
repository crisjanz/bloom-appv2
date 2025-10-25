/**
 * Offline Payment Adapter
 *
 * Handles all offline payment methods:
 * - CASH
 * - CHECK
 * - COD (Collect on Delivery)
 * - HOUSE_ACCOUNT
 * - OFFLINE (custom methods like E-TRANSFER)
 * - PAYPAL (future implementation)
 *
 * Extracted from PaymentService.ts lines 313-342, 374-419
 */

import { IPaymentAdapter } from './IPaymentAdapter'
import {
  PaymentMethodType,
  PaymentProvider,
  PaymentMethodRequest,
  PaymentMethodResult,
  PaymentMethodStatus
} from '../entities/Payment'

export class OfflinePaymentAdapter implements IPaymentAdapter {
  supports(type: PaymentMethodType): boolean {
    // Handles all offline payment methods
    return [
      PaymentMethodType.CASH,
      PaymentMethodType.CHECK,
      PaymentMethodType.COD,
      PaymentMethodType.HOUSE_ACCOUNT,
      PaymentMethodType.PAYPAL, // Future website integration
      // Note: Backend also has OFFLINE type for custom methods (E-TRANSFER, etc.)
    ].includes(type)
  }

  getProvider(): PaymentProvider {
    return PaymentProvider.CASH
  }

  async processPayment(
    transactionId: string,
    paymentMethod: PaymentMethodRequest,
    customerId: string
  ): Promise<PaymentMethodResult> {
    switch (paymentMethod.type) {
      case PaymentMethodType.CASH:
        return this.processCash(transactionId, paymentMethod)
      case PaymentMethodType.CHECK:
        return this.processCheck(transactionId, paymentMethod)
      case PaymentMethodType.COD:
        return this.processCOD(transactionId, paymentMethod)
      case PaymentMethodType.HOUSE_ACCOUNT:
        return this.processHouseAccount(transactionId, paymentMethod)
      case PaymentMethodType.PAYPAL:
        return this.processPayPal(transactionId, paymentMethod, customerId)
      default:
        // Handle custom offline methods (E-TRANSFER, etc.) via OFFLINE type
        return this.processCustomOfflineMethod(transactionId, paymentMethod)
    }
  }

  // COPIED EXACTLY FROM PaymentService.ts lines 313-342 (processCashPayment)
  private async processCash(
    transactionId: string,
    paymentMethod: PaymentMethodRequest
  ): Promise<PaymentMethodResult> {
    // Cash payments are always successful if amount is correct
    const amountTendered = paymentMethod.cashDetails?.amountTendered?.amount || 0

    if (amountTendered < paymentMethod.amount.amount) {
      return {
        type: PaymentMethodType.CASH,
        provider: PaymentProvider.CASH,
        amount: paymentMethod.amount,
        status: PaymentMethodStatus.FAILED,
        errorCode: 'INSUFFICIENT_CASH',
        errorMessage: 'Insufficient cash tendered'
      }
    }

    return {
      type: PaymentMethodType.CASH,
      provider: PaymentProvider.CASH,
      amount: paymentMethod.amount,
      status: PaymentMethodStatus.CAPTURED,
      receiptData: {
        transactionId: `CASH-${transactionId}`
      }
    }
  }

  private async processCheck(
    transactionId: string,
    paymentMethod: PaymentMethodRequest
  ): Promise<PaymentMethodResult> {
    // Check payments are instant capture with check number tracking
    return {
      type: PaymentMethodType.CHECK,
      provider: PaymentProvider.CASH,
      amount: paymentMethod.amount,
      status: PaymentMethodStatus.CAPTURED,
      receiptData: {
        transactionId: `CHECK-${transactionId}`,
        checkNumber: (paymentMethod as any).checkDetails?.checkNumber
      } as any
    }
  }

  private async processCOD(
    transactionId: string,
    paymentMethod: PaymentMethodRequest
  ): Promise<PaymentMethodResult> {
    // COD is pending until collected
    return {
      type: PaymentMethodType.COD,
      provider: PaymentProvider.CASH,
      amount: paymentMethod.amount,
      status: PaymentMethodStatus.PENDING,
      receiptData: {
        transactionId: `COD-${transactionId}`
      }
    }
  }

  private async processHouseAccount(
    transactionId: string,
    paymentMethod: PaymentMethodRequest
  ): Promise<PaymentMethodResult> {
    // House account - captured but tracked separately
    return {
      type: PaymentMethodType.HOUSE_ACCOUNT,
      provider: PaymentProvider.CASH,
      amount: paymentMethod.amount,
      status: PaymentMethodStatus.CAPTURED,
      receiptData: {
        transactionId: `HOUSE-${transactionId}`,
        accountReference: (paymentMethod as any).houseAccountDetails?.accountNumber
      } as any
    }
  }

  /**
   * Handle custom offline payment methods (E-TRANSFER, WIRE, etc.)
   * These are configured in settings via OfflinePaymentMethod model
   */
  private async processCustomOfflineMethod(
    transactionId: string,
    paymentMethod: PaymentMethodRequest
  ): Promise<PaymentMethodResult> {
    // Custom methods are instant capture with reference tracking
    return {
      type: PaymentMethodType.CASH, // Backend uses OFFLINE type
      provider: PaymentProvider.CASH,
      amount: paymentMethod.amount,
      status: PaymentMethodStatus.CAPTURED,
      receiptData: {
        transactionId: `OFFLINE-${transactionId}`,
        offlineMethodId: (paymentMethod as any).offlineDetails?.methodId,
        reference: (paymentMethod as any).offlineDetails?.reference
      } as any
    }
  }

  // COPIED EXACTLY FROM PaymentService.ts lines 374-419 (processPayPalPayment)
  private async processPayPal(
    transactionId: string,
    paymentMethod: PaymentMethodRequest,
    customerId: string
  ): Promise<PaymentMethodResult> {
    // This would integrate with PayPal SDK for website integration
    // Architecture ready for future implementation

    try {
      if (!paymentMethod.paypalDetails?.orderId) {
        throw new Error('PayPal order ID required')
      }

      // Future PayPal SDK integration
      console.log(`🚀 PayPal payment processing ready for order: ${paymentMethod.paypalDetails.orderId}`)

      // Placeholder for future PayPal capture API call
      // const paypalOrderCapture = await paypalClient.orders.capture(data.orderId)

      return {
        type: PaymentMethodType.PAYPAL,
        provider: PaymentProvider.PAYPAL,
        amount: paymentMethod.amount,
        status: PaymentMethodStatus.CAPTURED,
        providerTransactionId: `paypal_${Date.now()}`,
        receiptData: {
          payerId: (paymentMethod as any).paypalDetails?.payerId || `payer_${Date.now()}`,
          captureId: `paypal_${Date.now()}`,
          transactionId: `paypal_${Date.now()}`
        } as any
      }
    } catch (error) {
      return {
        type: PaymentMethodType.PAYPAL,
        provider: PaymentProvider.PAYPAL,
        amount: paymentMethod.amount,
        status: PaymentMethodStatus.FAILED,
        errorCode: 'PAYPAL_PROCESSING_ERROR',
        errorMessage: error instanceof Error ? error.message : 'PayPal payment processing failed'
      }
    }
  }
}
