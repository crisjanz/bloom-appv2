/**
 * Payment Service
 * Extracted business logic from PaymentController.tsx (711 lines → clean service)
 */

import { DomainService } from '@shared/types/common'
import {
  PaymentTransaction,
  TransactionRequest,
  TransactionResult,
  PaymentMethodRequest,
  PaymentMethodResult,
  PaymentMethodType,
  PaymentProvider,
  PaymentStatus,
  PaymentMethodStatus,
  GiftCardRequest,
  GiftCardResult,
  GiftCardStatus,
  PaymentError,
  PaymentErrorType,
  PaymentCustomerData,
  getProviderForPaymentMethod
} from '../entities/Payment'
import { PaymentRepository } from '../repositories/PaymentRepository'

export class PaymentService implements DomainService<PaymentTransaction> {
  constructor(
    private paymentRepository: PaymentRepository
  ) {}

  // ===== MAIN TRANSACTION PROCESSING (Extracted from PaymentController lines 254-418) =====

  /**
   * Process complete payment transaction
   * Extracted from PaymentController.createPaymentTransaction()
   */
  async processTransaction(request: TransactionRequest): Promise<TransactionResult> {
    try {
      // 1. Validate transaction request
      const validationResult = await this.validateTransactionRequest(request)
      if (!validationResult.isValid) {
        return this.createFailureResult(validationResult.errors.map(e => ({
          code: e.code,
          message: e.message,
          type: PaymentErrorType.VALIDATION_ERROR,
          isRetryable: false
        })))
      }

      // 2. Resolve customer (extracted from lines 258-289)
      const customerId = await this.resolveCustomer(request.customer, request.createGuestCustomer)

      // 3. Generate transaction number
      const transactionNumber = await this.generateTransactionNumber()

      // 4. Create payment transaction record
      const transaction = await this.createTransactionRecord({
        transactionNumber,
        customerId,
        request
      })

      // 5. Process each payment method
      const paymentResults: PaymentMethodResult[] = []
      let totalProcessed = 0

      for (const paymentMethod of request.paymentMethods) {
        const result = await this.processPaymentMethod(
          transaction.id,
          paymentMethod,
          customerId
        )
        paymentResults.push(result)
        
        if (result.status === PaymentMethodStatus.CAPTURED) {
          totalProcessed += result.amount.amount
        }
      }

      // 6. Process gift cards (extracted from lines 349-380)
      const giftCardResults: GiftCardResult[] = []
      if (request.giftCards.length > 0) {
        for (const giftCard of request.giftCards) {
          const result = await this.processGiftCard(
            transaction.id,
            giftCard,
            customerId
          )
          giftCardResults.push(result)
        }
      }

      // 7. Update transaction status
      const isSuccess = paymentResults.every(r => r.status === PaymentMethodStatus.CAPTURED) &&
                       giftCardResults.every(r => r.status === GiftCardStatus.ACTIVATED)

      await this.updateTransactionStatus(
        transaction.id, 
        isSuccess ? PaymentStatus.COMPLETED : PaymentStatus.FAILED
      )

      // 8. Return comprehensive result
      return {
        success: isSuccess,
        transactionId: transaction.id,
        transactionNumber,
        paymentResults,
        giftCardResults,
        customerId,
        errors: paymentResults
          .filter(r => r.status === PaymentMethodStatus.FAILED)
          .map(r => ({
            code: r.errorCode || 'PAYMENT_FAILED',
            message: r.errorMessage || 'Payment processing failed',
            type: PaymentErrorType.PROVIDER_ERROR,
            provider: r.provider,
            paymentMethodType: r.type,
            amount: r.amount,
            isRetryable: true
          })),
        warnings: [],
        totalProcessed: { amount: totalProcessed, currency: 'CAD' },
        totalFailed: { 
          amount: request.totals.grandTotal.amount - totalProcessed, 
          currency: 'CAD' 
        },
        processedAt: new Date(),
        processingTime: 0 // Will be calculated
      }

    } catch (error) {
      console.error('Payment transaction error:', error)
      return this.createFailureResult([{
        code: 'SYSTEM_ERROR',
        message: error instanceof Error ? error.message : 'Unknown system error',
        type: PaymentErrorType.SYSTEM_ERROR,
        isRetryable: true
      }])
    }
  }

  // ===== CUSTOMER RESOLUTION (Extracted from PaymentController lines 258-289) =====

  /**
   * Resolve customer for payment transaction
   * Handles guest customer creation
   */
  async resolveCustomer(
    customerData?: PaymentCustomerData, 
    createGuest: boolean = false
  ): Promise<string> {
    // If customer ID provided, use it
    if (customerData?.id) {
      return customerData.id
    }

    // If no customer data and not creating guest, throw error
    if (!customerData && !createGuest) {
      throw new Error('Customer information required')
    }

    // Create guest customer (original logic from PaymentController)
    if (!customerData || createGuest) {
      return await this.createGuestCustomer()
    }

    // Create customer from provided data
    return await this.createCustomerFromData(customerData)
  }

  /**
   * Create guest customer for transaction
   */
  private async createGuestCustomer(): Promise<string> {
    // This would integrate with Customer domain
    const guestCustomer = {
      firstName: 'Walk-in',
      lastName: 'Customer',
      email: undefined,
      phone: undefined,
      customerType: 'WALK_IN'
    }

    // Mock customer creation - would call CustomerService
    return `guest-${Date.now()}`
  }

  /**
   * Create customer from payment data
   */
  private async createCustomerFromData(customerData: PaymentCustomerData): Promise<string> {
    // This would integrate with Customer domain
    // Mock implementation
    return `customer-${Date.now()}`
  }

  // ===== PAYMENT METHOD PROCESSING =====

  /**
   * Process individual payment method
   */
  async processPaymentMethod(
    transactionId: string,
    paymentMethod: PaymentMethodRequest,
    customerId: string
  ): Promise<PaymentMethodResult> {
    const provider = getProviderForPaymentMethod(paymentMethod.type)

    try {
      switch (provider) {
        case PaymentProvider.STRIPE:
          return await this.processStripePayment(transactionId, paymentMethod, customerId)
        
        case PaymentProvider.SQUARE:
          return await this.processSquarePayment(transactionId, paymentMethod, customerId)
        
        case PaymentProvider.CASH:
          return await this.processCashPayment(transactionId, paymentMethod)
        
        case PaymentProvider.GIFT_CARD:
          return await this.processGiftCardPayment(transactionId, paymentMethod)
        
        case PaymentProvider.PAYPAL:
          return await this.processPayPalPayment(transactionId, paymentMethod, customerId)
        
        default:
          throw new Error(`Unsupported payment provider: ${provider}`)
      }
    } catch (error) {
      return {
        type: paymentMethod.type,
        provider,
        amount: paymentMethod.amount,
        status: PaymentMethodStatus.FAILED,
        errorCode: 'PROCESSING_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Payment processing failed'
      }
    }
  }

  /**
   * Process Stripe payment
   */
  private async processStripePayment(
    transactionId: string,
    paymentMethod: PaymentMethodRequest,
    customerId: string
  ): Promise<PaymentMethodResult> {
    // This would integrate with existing StripeService
    // Mock implementation for now
    
    if (!paymentMethod.cardDetails?.paymentMethodId) {
      throw new Error('Stripe payment method ID required')
    }

    // Simulate Stripe API call
    const stripeResult = await this.callStripeAPI({
      amount: paymentMethod.amount.amount * 100, // Convert to cents
      paymentMethodId: paymentMethod.cardDetails.paymentMethodId,
      customerId,
      metadata: { transactionId }
    })

    return {
      type: paymentMethod.type,
      provider: PaymentProvider.STRIPE,
      amount: paymentMethod.amount,
      status: stripeResult.success ? PaymentMethodStatus.CAPTURED : PaymentMethodStatus.FAILED,
      providerTransactionId: stripeResult.paymentIntentId,
      authorizationCode: stripeResult.authCode,
      errorCode: stripeResult.errorCode,
      errorMessage: stripeResult.errorMessage,
      receiptData: stripeResult.success ? {
        cardLast4: stripeResult.cardLast4,
        cardBrand: stripeResult.cardBrand,
        authCode: stripeResult.authCode,
        transactionId: stripeResult.paymentIntentId
      } : undefined
    }
  }

  /**
   * Process Square payment
   */
  private async processSquarePayment(
    transactionId: string,
    paymentMethod: PaymentMethodRequest,
    customerId: string
  ): Promise<PaymentMethodResult> {
    // This would integrate with existing SquareService
    // Mock implementation for now
    
    const squareResult = await this.callSquareAPI({
      amount: paymentMethod.amount.amount * 100, // Convert to cents
      token: paymentMethod.cardDetails?.token,
      customerId,
      referenceId: transactionId
    })

    return {
      type: paymentMethod.type,
      provider: PaymentProvider.SQUARE,
      amount: paymentMethod.amount,
      status: squareResult.success ? PaymentMethodStatus.CAPTURED : PaymentMethodStatus.FAILED,
      providerTransactionId: squareResult.paymentId,
      errorCode: squareResult.errorCode,
      errorMessage: squareResult.errorMessage
    }
  }

  /**
   * Process cash payment
   */
  private async processCashPayment(
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

  /**
   * Process gift card payment
   */
  private async processGiftCardPayment(
    transactionId: string,
    paymentMethod: PaymentMethodRequest
  ): Promise<PaymentMethodResult> {
    // This would integrate with existing GiftCardService
    // Mock implementation
    
    const giftCardResult = await this.validateAndChargeGiftCard({
      cardNumber: paymentMethod.giftCardDetails?.cardNumber,
      amount: paymentMethod.amount.amount,
      verificationCode: paymentMethod.giftCardDetails?.verificationCode
    })

    return {
      type: PaymentMethodType.GIFT_CARD,
      provider: PaymentProvider.GIFT_CARD,
      amount: paymentMethod.amount,
      status: giftCardResult.success ? PaymentMethodStatus.CAPTURED : PaymentMethodStatus.FAILED,
      providerTransactionId: giftCardResult.transactionId,
      errorCode: giftCardResult.errorCode,
      errorMessage: giftCardResult.errorMessage
    }
  }

  /**
   * Process PayPal payment (future website integration)
   */
  private async processPayPalPayment(
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

      const paypalResult = await this.callPayPalAPI({
        orderId: paymentMethod.paypalDetails.orderId,
        payerId: paymentMethod.paypalDetails.payerId,
        amount: paymentMethod.amount.amount,
        customerId,
        transactionId
      })

      return {
        type: PaymentMethodType.PAYPAL,
        provider: PaymentProvider.PAYPAL,
        amount: paymentMethod.amount,
        status: paypalResult.success ? PaymentMethodStatus.CAPTURED : PaymentMethodStatus.FAILED,
        providerTransactionId: paypalResult.captureId,
        errorCode: paypalResult.errorCode,
        errorMessage: paypalResult.errorMessage,
        receiptData: paypalResult.success ? {
          payerId: paypalResult.payerId,
          captureId: paypalResult.captureId,
          transactionId: paypalResult.captureId
        } : undefined
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

  // ===== GIFT CARD PROCESSING (Extracted from PaymentController lines 349-380) =====

  /**
   * Process gift card activation
   */
  async processGiftCard(
    transactionId: string,
    giftCard: GiftCardRequest,
    customerId: string
  ): Promise<GiftCardResult> {
    try {
      // This would integrate with existing GiftCardService
      const activationResult = await this.activateGiftCard({
        amount: giftCard.amount.amount,
        customerName: giftCard.customerName,
        customerEmail: giftCard.customerEmail,
        deliveryMethod: giftCard.deliveryMethod,
        message: giftCard.message,
        transactionId
      })

      return {
        cardNumber: activationResult.cardNumber,
        amount: giftCard.amount,
        status: activationResult.success ? GiftCardStatus.ACTIVATED : GiftCardStatus.FAILED,
        activationCode: activationResult.activationCode,
        errorMessage: activationResult.errorMessage,
        deliveryMethod: giftCard.deliveryMethod,
        deliveryStatus: activationResult.deliveryStatus
      }
    } catch (error) {
      return {
        cardNumber: '',
        amount: giftCard.amount,
        status: GiftCardStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Gift card activation failed',
        deliveryMethod: giftCard.deliveryMethod
      }
    }
  }

  // ===== VALIDATION =====

  /**
   * Validate transaction request
   */
  private async validateTransactionRequest(request: TransactionRequest): Promise<{
    isValid: boolean
    errors: Array<{ code: string; message: string }>
  }> {
    const errors: Array<{ code: string; message: string }> = []

    // Validate payment methods
    if (!request.paymentMethods || request.paymentMethods.length === 0) {
      errors.push({
        code: 'NO_PAYMENT_METHODS',
        message: 'At least one payment method is required'
      })
    }

    // Validate payment method amounts sum to total
    const paymentTotal = request.paymentMethods.reduce((sum, pm) => sum + pm.amount.amount, 0)
    if (Math.abs(paymentTotal - request.totals.grandTotal.amount) > 0.01) {
      errors.push({
        code: 'AMOUNT_MISMATCH',
        message: 'Payment method amounts do not match transaction total'
      })
    }

    // Validate cart items
    if (!request.cartItems || request.cartItems.length === 0) {
      errors.push({
        code: 'NO_CART_ITEMS',
        message: 'Cart items are required for payment processing'
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // ===== CRUD OPERATIONS =====

  async create(data: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentTransaction> {
    return await this.paymentRepository.save(data as PaymentTransaction)
  }

  async findById(id: string): Promise<PaymentTransaction | null> {
    return await this.paymentRepository.findById(id)
  }

  async update(id: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction> {
    return await this.paymentRepository.update(id, updates)
  }

  async delete(id: string): Promise<void> {
    await this.paymentRepository.delete(id)
  }

  // ===== HELPER METHODS =====

  /**
   * Generate unique transaction number (PT-XXXX format)
   */
  private async generateTransactionNumber(): Promise<string> {
    const lastTransaction = await this.paymentRepository.getLastTransaction()
    const lastNumber = lastTransaction ? 
      parseInt(lastTransaction.transactionNumber.replace('PT-', '')) : 
      10000
    
    return `PT-${(lastNumber + 1).toString().padStart(4, '0')}`
  }

  /**
   * Create transaction record
   */
  private async createTransactionRecord(data: {
    transactionNumber: string
    customerId: string
    request: TransactionRequest
  }): Promise<PaymentTransaction> {
    const transaction: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
      transactionNumber: data.transactionNumber,
      customerId: data.customerId,
      employeeId: data.request.employeeId,
      totalAmount: data.request.totals.grandTotal,
      paymentMethods: [], // Will be populated as methods are processed
      paymentStatus: PaymentStatus.PROCESSING,
      customerSnapshot: this.createCustomerSnapshot(data.request.customer, data.customerId),
      giftCards: [],
      providerTransactions: [],
      cartSnapshot: {
        items: data.request.cartItems,
        subtotal: data.request.totals.subtotal,
        discountTotal: data.request.totals.discountTotal,
        taxTotal: data.request.totals.taxTotal,
        grandTotal: data.request.totals.grandTotal
      },
      discountsApplied: data.request.appliedDiscounts,
      processedAt: new Date(),
      notes: data.request.notes,
      errorMessages: [],
      retryCount: 0
    }

    return await this.create(transaction)
  }

  /**
   * Create customer snapshot for transaction
   */
  private createCustomerSnapshot(customerData?: PaymentCustomerData, customerId?: string): any {
    return {
      customerId: customerId || 'unknown',
      firstName: customerData?.firstName || 'Walk-in',
      lastName: customerData?.lastName || 'Customer',
      email: customerData?.email,
      phone: customerData?.phone,
      isGuest: !customerData?.id,
      address: customerData?.address
    }
  }

  /**
   * Update transaction status
   */
  private async updateTransactionStatus(
    transactionId: string, 
    status: PaymentStatus
  ): Promise<void> {
    await this.update(transactionId, {
      paymentStatus: status,
      completedAt: status === PaymentStatus.COMPLETED ? new Date() : undefined
    })
  }

  /**
   * Create failure result
   */
  private createFailureResult(errors: PaymentError[]): TransactionResult {
    return {
      success: false,
      transactionId: '',
      transactionNumber: '',
      paymentResults: [],
      giftCardResults: [],
      customerId: '',
      errors,
      warnings: [],
      totalProcessed: { amount: 0, currency: 'CAD' },
      totalFailed: { amount: 0, currency: 'CAD' },
      processedAt: new Date(),
      processingTime: 0
    }
  }

  // ===== STRIPE INTEGRATION =====

  private async callStripeAPI(data: {
    amount: number; // Amount in cents
    paymentMethodId: string;
    customerId: string;
    metadata?: Record<string, string>;
  }): Promise<{
    success: boolean;
    paymentIntentId?: string;
    authCode?: string;
    cardLast4?: string;
    cardBrand?: string;
    errorCode?: string;
    errorMessage?: string;
  }> {
    try {
      // Import the existing StripeService
      const { default: stripeService } = await import('../../../shared/legacy-services/stripeService')
      
      // Create payment intent with customer and metadata
      const paymentIntentResult = await stripeService.createPaymentIntent({
        amount: data.amount / 100, // Convert cents back to dollars for frontend service
        customerId: data.customerId,
        metadata: data.metadata
      })

      if (!paymentIntentResult.success) {
        return {
          success: false,
          errorCode: 'PAYMENT_INTENT_FAILED',
          errorMessage: paymentIntentResult.error || 'Failed to create payment intent'
        }
      }

      // Confirm payment intent with the payment method
      const confirmResult = await stripeService.confirmPaymentIntent(
        paymentIntentResult.paymentIntentId,
        data.paymentMethodId
      )

      // Extract card details from confirmation result
      const cardLast4 = confirmResult.payment_method?.card?.last4 || '****'
      const cardBrand = confirmResult.payment_method?.card?.brand || 'unknown'

      return {
        success: confirmResult.status === 'succeeded',
        paymentIntentId: confirmResult.id,
        authCode: confirmResult.charges?.data?.[0]?.authorization_code || 'AUTH_PENDING',
        cardLast4,
        cardBrand,
        errorCode: confirmResult.status !== 'succeeded' ? 'PAYMENT_FAILED' : undefined,
        errorMessage: confirmResult.status !== 'succeeded' 
          ? `Payment status: ${confirmResult.status}` 
          : undefined
      }
    } catch (error) {
      console.error('Stripe API integration error:', error)
      return {
        success: false,
        errorCode: 'STRIPE_API_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Stripe API call failed'
      }
    }
  }

  private async callSquareAPI(data: {
    amount: number; // Amount in cents
    token: string;
    customerId: string;
    referenceId: string;
  }): Promise<{
    success: boolean;
    paymentId?: string;
    authCode?: string;
    errorCode?: string;
    errorMessage?: string;
  }> {
    try {
      // Check if this is a saved card payment (customerCardId)
      if (data.token.startsWith('card-')) {
        // Use frontend Square service for saved card payments
        const { default: stripeService } = await import('../../../shared/legacy-services/stripeService')
        
        const result = await stripeService.processSquareSavedCardPayment({
          amount: data.amount / 100, // Convert cents back to dollars
          customerId: data.customerId,
          customerCardId: data.token,
          description: `Transaction ${data.referenceId}`
        })

        return {
          success: result.success || false,
          paymentId: result.paymentId,
          authCode: result.authCode || 'SQ_AUTH_PENDING',
          errorCode: result.error ? 'SQUARE_SAVED_CARD_ERROR' : undefined,
          errorMessage: result.error
        }
      } else {
        // Use backend Square service for direct payment with nonce
        const response = await fetch('http://localhost:4000/api/square/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: data.amount / 100, // Convert cents back to dollars
            currency: 'CAD',
            sourceId: data.token,
            customerId: data.customerId,
            description: `Transaction ${data.referenceId}`
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Square payment failed')
        }

        const result = await response.json()
        
        return {
          success: result.success || false,
          paymentId: result.payment?.id || result.paymentId,
          authCode: result.payment?.authorization_code || 'SQ_AUTH_PENDING',
          errorCode: result.error ? 'SQUARE_PAYMENT_ERROR' : undefined,
          errorMessage: result.error
        }
      }
    } catch (error) {
      console.error('Square API integration error:', error)
      return {
        success: false,
        errorCode: 'SQUARE_API_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Square API call failed'
      }
    }
  }

  private async validateAndChargeGiftCard(data: any): Promise<any> {
    // Mock gift card validation - would integrate with real GiftCardService
    return {
      success: true,
      transactionId: `gc_${Date.now()}`,
      balance: 100.00
    }
  }

  private async activateGiftCard(data: any): Promise<any> {
    // Mock gift card activation - would integrate with real GiftCardService
    return {
      success: true,
      cardNumber: `GC${Date.now().toString().substr(-8)}`,
      activationCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
      deliveryStatus: 'PENDING'
    }
  }

  // ===== PAYPAL INTEGRATION (Future website integration) =====

  private async callPayPalAPI(data: {
    orderId: string;
    payerId?: string;
    amount: number;
    customerId: string;
    transactionId: string;
  }): Promise<{
    success: boolean;
    captureId?: string;
    payerId?: string;
    errorCode?: string;
    errorMessage?: string;
  }> {
    try {
      // Future PayPal SDK integration for website
      // This would integrate with @paypal/checkout-server-sdk
      // Architecture ready for implementation
      
      // Mock implementation for now - would be replaced with real PayPal SDK calls
      console.log(`🚀 PayPal payment processing ready for order: ${data.orderId}`)
      
      // Placeholder for future PayPal capture API call
      // const paypalOrderCapture = await paypalClient.orders.capture(data.orderId)
      
      return {
        success: true,
        captureId: `paypal_${Date.now()}`,
        payerId: data.payerId || `payer_${Date.now()}`,
      }
    } catch (error) {
      console.error('PayPal API integration error:', error)
      return {
        success: false,
        errorCode: 'PAYPAL_API_ERROR',
        errorMessage: error instanceof Error ? error.message : 'PayPal API call failed'
      }
    }
  }
}