/**
 * Payment Service
 * Extracted business logic from PaymentController.tsx (711 lines → clean service)
 * Refactored to use Adapter pattern for payment providers
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
import { IPaymentAdapter } from '../adapters/IPaymentAdapter'
import { StripePaymentAdapter } from '../adapters/StripePaymentAdapter'
import { SquarePaymentAdapter } from '../adapters/SquarePaymentAdapter'
import { GiftCardStoreCreditAdapter } from '../adapters/GiftCardStoreCreditAdapter'
import { OfflinePaymentAdapter } from '../adapters/OfflinePaymentAdapter'

export class PaymentService implements DomainService<PaymentTransaction> {
  private adapters: IPaymentAdapter[]

  constructor(
    private paymentRepository: PaymentRepository
  ) {
    // Initialize payment adapters
    this.adapters = [
      new StripePaymentAdapter(),
      new SquarePaymentAdapter(),
      new GiftCardStoreCreditAdapter(),
      new OfflinePaymentAdapter()
    ]
  }

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

  // ===== PAYMENT METHOD PROCESSING (Refactored to use Adapter pattern) =====

  /**
   * Process individual payment method
   * Delegates to appropriate adapter based on payment method type
   */
  async processPaymentMethod(
    transactionId: string,
    paymentMethod: PaymentMethodRequest,
    customerId: string
  ): Promise<PaymentMethodResult> {
    // Find adapter that supports this payment method type
    const adapter = this.adapters.find(a => a.supports(paymentMethod.type))

    if (!adapter) {
      const provider = getProviderForPaymentMethod(paymentMethod.type)
      return {
        type: paymentMethod.type,
        provider,
        amount: paymentMethod.amount,
        status: PaymentMethodStatus.FAILED,
        errorCode: 'UNSUPPORTED_PAYMENT_METHOD',
        errorMessage: `No adapter found for payment type: ${paymentMethod.type}`
      }
    }

    try {
      // Delegate to adapter
      return await adapter.processPayment(transactionId, paymentMethod, customerId)
    } catch (error) {
      console.error('Payment processing error:', error)
      return {
        type: paymentMethod.type,
        provider: adapter.getProvider(),
        amount: paymentMethod.amount,
        status: PaymentMethodStatus.FAILED,
        errorCode: 'PROCESSING_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Payment processing failed'
      }
    }
  }

  // ===== GIFT CARD PROCESSING (Extracted from PaymentController lines 349-380) =====

  /**
   * Process gift card activation
   * Updated to use existing giftCardService
   */
  async processGiftCard(
    transactionId: string,
    giftCard: GiftCardRequest,
    customerId: string
  ): Promise<GiftCardResult> {
    try {
      // ✅ USE EXISTING SERVICE
      const { activateGiftCard } = await import('../../../shared/legacy-services/giftCardService')

      // Activate gift card using existing service
      const result = await activateGiftCard(
        giftCard.cardNumber || `GC${Date.now().toString().substr(-8)}`,
        giftCard.amount.amount,
        customerId,
        undefined, // employeeId
        transactionId
      )

      return {
        cardNumber: result.cardNumber,
        amount: giftCard.amount,
        status: GiftCardStatus.ACTIVATED,
        activationCode: result.activationCode,
        deliveryMethod: giftCard.deliveryMethod,
        deliveryStatus: 'PENDING'
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
}
