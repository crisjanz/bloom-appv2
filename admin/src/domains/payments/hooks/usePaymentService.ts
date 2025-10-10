/**
 * React Hooks for Payment Service
 * Clean interface for PaymentController and other components
 */

import { useState, useCallback } from 'react'
import { PaymentService } from '../services/PaymentService'
import { PaymentRepository } from '../repositories/PaymentRepository'
import {
  PaymentTransaction,
  TransactionRequest,
  TransactionResult,
  PaymentMethodType,
  // PaymentProvider,
  PaymentStatus,
  PaymentCustomerData,
  PaymentMethodRequest,
  GiftCardRequest,
  GiftCardDeliveryMethod
} from '../entities/Payment'
import { Money } from '@shared/types/common'

// Create singleton instances
const paymentRepository = new PaymentRepository()
const paymentService = new PaymentService(paymentRepository)

// ===== MAIN PAYMENT SERVICE HOOK =====

export const usePaymentService = () => {
  const [loading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Clear error helper
  const clearError = useCallback(() => setError(null), [])
  

  return {
    // State
    loading,
    error,
    clearError,
    
    // Direct service access
    paymentService,
    paymentRepository
  }
}

// ===== PAYMENT PROCESSING HOOK =====

export const usePaymentProcessor = () => {
  const { paymentService } = usePaymentService()
  const [processing, setProcessing] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<TransactionResult | null>(null)

  // Process complete payment transaction
  const processPayment = useCallback(async (request: TransactionRequest): Promise<TransactionResult> => {
    setProcessing(true)
    
    try {
      const result = await paymentService.processTransaction(request)
      setLastTransaction(result)
      return result
    } catch (error) {
      console.error('Payment processing error:', error)
      throw error
    } finally {
      setProcessing(false)
    }
  }, [paymentService])

  // Create transaction request from PaymentController data
  const createTransactionRequest = useCallback((data: {
    customer?: any
    cartItems: any[]
    paymentMethods: Array<{ method: string; amount: number; details?: any }>
    appliedDiscounts?: any[]
    totals: {
      subtotal: number
      discountTotal: number
      taxTotal: number
      grandTotal: number
    }
    giftCards?: any[]
    notes?: string
    employeeId?: string
  }): TransactionRequest => {
    // Convert customer data
    const customerData: PaymentCustomerData | undefined = data.customer ? {
      id: data.customer.id,
      firstName: data.customer.firstName || data.customer.name?.split(' ')[0],
      lastName: data.customer.lastName || data.customer.name?.split(' ')[1],
      email: data.customer.email,
      phone: data.customer.phone
    } : undefined

    // Convert payment methods
    const paymentMethods: PaymentMethodRequest[] = data.paymentMethods.map(pm => {
      const amount: Money = { amount: pm.amount, currency: 'CAD' }
      
      switch (pm.method) {
        case 'cash':
          return {
            type: PaymentMethodType.CASH,
            amount,
            cashDetails: {
              amountTendered: { amount: pm.details?.amountTendered || pm.amount, currency: 'CAD' }
            }
          }
        
        case 'credit':
        case 'debit':
        case 'card':
          return {
            type: PaymentMethodType.CARD,
            amount,
            cardDetails: {
              paymentMethodId: pm.details?.paymentMethodId,
              token: pm.details?.token,
              saveCard: pm.details?.saveCard || false
            }
          }
        
        case 'gift_card':
          return {
            type: PaymentMethodType.GIFT_CARD,
            amount,
            giftCardDetails: {
              cardNumber: pm.details?.cardNumber,
              verificationCode: pm.details?.verificationCode
            }
          }
        
        case 'paypal':
          return {
            type: PaymentMethodType.PAYPAL,
            amount,
            paypalDetails: {
              orderId: pm.details?.orderId,
              payerId: pm.details?.payerId,
              returnUrl: pm.details?.returnUrl,
              cancelUrl: pm.details?.cancelUrl
            }
          }
        
        default:
          throw new Error(`Unsupported payment method: ${pm.method}`)
      }
    })

    // Convert cart items
    const cartItems = data.cartItems.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: { amount: item.customPrice || item.price, currency: 'CAD' },
      totalPrice: { amount: (item.customPrice || item.price) * item.quantity, currency: 'CAD' },
      category: item.category,
      productId: item.productId,
      variantId: item.variantId,
      isCustomItem: item.isCustom || false
    }))

    // Convert discounts
    const appliedDiscounts = (data.appliedDiscounts || []).map(discount => ({
      id: `discount-${Date.now()}`,
      name: discount.description || discount.name,
      type: discount.type.includes('%') ? 'PERCENTAGE' as const : 'FIXED_AMOUNT' as const,
      value: discount.amount,
      discountAmount: { amount: discount.amount, currency: 'CAD' },
      source: 'MANUAL' as const
    }))

    // Convert gift cards
    const giftCards: GiftCardRequest[] = (data.giftCards || []).map(gc => ({
      amount: { amount: gc.amount, currency: 'CAD' },
      customerName: gc.customerName,
      customerEmail: gc.customerEmail,
      deliveryMethod: gc.type === 'DIGITAL' ? GiftCardDeliveryMethod.EMAIL : GiftCardDeliveryMethod.PRINT,
      message: gc.message
    }))

    return {
      customer: customerData,
      createGuestCustomer: !customerData,
      paymentMethods,
      cartItems,
      appliedDiscounts,
      totals: {
        subtotal: { amount: data.totals.subtotal, currency: 'CAD' },
        discountTotal: { amount: data.totals.discountTotal, currency: 'CAD' },
        taxTotal: { amount: data.totals.taxTotal, currency: 'CAD' },
        grandTotal: { amount: data.totals.grandTotal, currency: 'CAD' }
      },
      giftCards,
      notes: data.notes,
      employeeId: data.employeeId,
      source: 'POS'
    }
  }, [])

  return {
    // State
    processing,
    lastTransaction,
    
    // Operations
    processPayment,
    createTransactionRequest
  }
}

// ===== POS PAYMENT HOOK (Drop-in replacement for PaymentController) =====

export const usePOSPayments = () => {
  const { paymentService, error } = usePaymentService()
  const { processPayment, createTransactionRequest, processing } = usePaymentProcessor()

  // Create guest customer (extracted from PaymentController)
  const createGuestCustomer = useCallback(async (): Promise<string> => {
    try {
      return await paymentService.resolveCustomer(undefined, true)
    } catch (error) {
      console.error('Guest customer creation error:', error)
      throw error
    }
  }, [paymentService])

  // Validate discount/coupon (extracted from PaymentController)
  const validateDiscount = useCallback(async (data: {
    code: string
    cartItems: any[]
    customerId?: string
    source: string
  }): Promise<{ 
    valid: boolean
    discount?: any
    discountAmount?: number
    error?: string 
  }> => {
    try {
      // This would integrate with the unified discount system
      const response = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Discount validation failed')
      }

      const result = await response.json()
      return {
        valid: result.isValid,
        discount: result.discount,
        discountAmount: result.discountAmount,
        error: result.error
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      }
    }
  }, [])

  // Create payment transaction (main PaymentController operation)
  const createPaymentTransaction = useCallback(async (data: {
    customer?: any
    cartItems: any[]
    paymentMethods: Array<{ method: string; amount: number; details?: any }>
    appliedDiscounts?: any[]
    totals: {
      subtotal: number
      discountTotal: number
      taxTotal: number
      grandTotal: number
    }
    giftCards?: any[]
    notes?: string
    employeeId?: string
  }): Promise<TransactionResult> => {
    const request = createTransactionRequest(data)
    return await processPayment(request)
  }, [createTransactionRequest, processPayment])

  return {
    // State (matches PaymentController expectations)
    processing,
    error,
    
    // Operations (matches PaymentController usage)
    createPaymentTransaction,
    validateDiscount,
    createGuestCustomer,
    
    // Advanced operations
    paymentService
  }
}

// ===== TRANSACTION MANAGEMENT HOOK =====

export const usePaymentTransactions = () => {
  const { paymentRepository } = usePaymentService()
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(false)

  // Load transactions by criteria
  const loadTransactions = useCallback(async (criteria: {
    customerId?: string
    employeeId?: string
    dateFrom?: Date
    dateTo?: Date
    status?: PaymentStatus
    limit?: number
  }) => {
    setLoading(true)
    try {
      const results = await paymentRepository.search(criteria)
      setTransactions(results)
    } catch (error) {
      console.error('Failed to load transactions:', error)
    } finally {
      setLoading(false)
    }
  }, [paymentRepository])

  // Find transaction by PT number
  const findByTransactionNumber = useCallback(async (transactionNumber: string): Promise<PaymentTransaction | null> => {
    try {
      return await paymentRepository.findByTransactionNumber(transactionNumber)
    } catch (error) {
      console.error('Failed to find transaction:', error)
      return null
    }
  }, [paymentRepository])

  // Get daily summary
  const getDailySummary = useCallback(async (date: Date) => {
    try {
      return await paymentRepository.getDailySummary(date)
    } catch (error) {
      console.error('Failed to get daily summary:', error)
      return null
    }
  }, [paymentRepository])

  return {
    // State
    transactions,
    loading,
    
    // Operations
    loadTransactions,
    findByTransactionNumber,
    getDailySummary
  }
}

// ===== GIFT CARD INTEGRATION HOOK =====

export const usePaymentGiftCards = () => {
  const { paymentService } = usePaymentService()

  // Process gift card activation (extracted from PaymentController)
  const activateGiftCards = useCallback(async (
    transactionId: string,
    giftCards: Array<{
      amount: number
      customerName?: string
      customerEmail?: string
      deliveryMethod: 'EMAIL' | 'PRINT'
      message?: string
    }>
  ) => {
    const results = []
    
    for (const giftCard of giftCards) {
      const giftCardRequest: GiftCardRequest = {
        amount: { amount: giftCard.amount, currency: 'CAD' },
        customerName: giftCard.customerName,
        customerEmail: giftCard.customerEmail,
        deliveryMethod: giftCard.deliveryMethod === 'EMAIL' 
          ? GiftCardDeliveryMethod.EMAIL 
          : GiftCardDeliveryMethod.PRINT,
        message: giftCard.message
      }
      
      const result = await paymentService.processGiftCard(transactionId, giftCardRequest, 'unknown')
      results.push(result)
    }
    
    return results
  }, [paymentService])

  return {
    activateGiftCards
  }
}

// ===== PAYMENT ANALYTICS HOOK =====

export const usePaymentAnalytics = () => {
  const { paymentRepository } = usePaymentService()

  // Get payment analytics
  const getAnalytics = useCallback(async (dateFrom: Date, dateTo: Date) => {
    try {
      return await paymentRepository.getPaymentAnalytics(dateFrom, dateTo)
    } catch (error) {
      console.error('Failed to get payment analytics:', error)
      return null
    }
  }, [paymentRepository])

  return {
    getAnalytics
  }
}

// ===== PAYMENT CONTROLLER DOMAIN HOOK (Legacy Compatibility) =====

export const usePaymentControllerDomain = () => {
  const posPayments = usePOSPayments()
  const giftCards = usePaymentGiftCards()
  const analytics = usePaymentAnalytics()

  return {
    ...posPayments,
    ...giftCards,
    ...analytics
  }
}