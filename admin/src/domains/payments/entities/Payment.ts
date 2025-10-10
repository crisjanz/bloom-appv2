/**
 * Payment Domain Entities
 * Extracted from PaymentController.tsx business logic
 */

import { DomainEntity, Money } from '@shared/types/common'

// ===== CORE PAYMENT ENTITIES =====

export interface PaymentTransaction extends DomainEntity {
  // Transaction identification
  transactionNumber: string // PT-XXXX format
  orderId?: string // Links to order if applicable
  customerId: string
  employeeId?: string // Staff who processed payment
  
  // Payment details
  totalAmount: Money
  paymentMethods: PaymentMethodUsed[]
  paymentStatus: PaymentStatus
  
  // Customer information snapshot
  customerSnapshot: PaymentCustomerSnapshot
  
  // Gift card integration
  giftCards: GiftCardActivation[]
  
  // Provider details
  providerTransactions: ProviderTransaction[]
  
  // Business data
  cartSnapshot: PaymentCartSnapshot
  discountsApplied: PaymentDiscount[]
  
  // Metadata
  processedAt: Date
  completedAt?: Date
  refundedAt?: Date
  notes?: string
  
  // Error tracking
  errorMessages: string[]
  retryCount: number
}

export interface PaymentMethodUsed {
  id: string
  type: PaymentMethodType
  provider: PaymentProvider
  amount: Money
  
  // Method-specific details
  cardDetails?: {
    last4: string
    brand: string
    expiryMonth: number
    expiryYear: number
  }
  
  giftCardDetails?: {
    cardNumber: string
    activationCode?: string
    isNewCard: boolean
  }
  
  cashDetails?: {
    amountTendered: Money
    changeGiven: Money
  }
  
  // Processing details
  providerTransactionId?: string
  authorizationCode?: string
  processedAt: Date
  status: PaymentMethodStatus
}

export interface ProviderTransaction {
  id: string
  provider: PaymentProvider
  providerTransactionId: string
  amount: Money
  status: ProviderTransactionStatus
  
  // Provider-specific data
  stripeData?: {
    paymentIntentId: string
    chargeId?: string
    customerId?: string
    paymentMethodId?: string
  }
  
  squareData?: {
    paymentId: string
    locationId: string
    orderId?: string
    customerId?: string
  }
  
  // Processing timestamps
  createdAt: Date
  authorizedAt?: Date
  capturedAt?: Date
  failedAt?: Date
  
  // Error details
  errorCode?: string
  errorMessage?: string
  
  // Metadata
  metadata: Record<string, any>
}

// ===== PAYMENT ENUMS =====

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

export enum PaymentMethodType {
  CARD = 'CARD',
  CASH = 'CASH',
  GIFT_CARD = 'GIFT_CARD',
  PAYPAL = 'PAYPAL', // Future website integration
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  SQUARE = 'SQUARE',
  PAYPAL = 'PAYPAL', // Future website integration
  CASH = 'CASH',
  GIFT_CARD = 'GIFT_CARD'
}

export enum PaymentMethodStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum ProviderTransactionStatus {
  CREATED = 'CREATED',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

// ===== GIFT CARD INTEGRATION =====

export interface GiftCardActivation {
  id: string
  cardNumber: string
  amount: Money
  activationCode?: string
  customerName?: string
  customerEmail?: string
  
  // Activation details
  isNewCard: boolean
  activatedAt?: Date
  deliveryMethod: GiftCardDeliveryMethod
  
  // Integration with gift card service
  giftCardServiceId?: string
  activationStatus: GiftCardStatus
  
  // Error tracking
  activationError?: string
}

export enum GiftCardDeliveryMethod {
  EMAIL = 'EMAIL',
  PRINT = 'PRINT',
  PICKUP = 'PICKUP'
}

export enum GiftCardStatus {
  PENDING = 'PENDING',
  ACTIVATED = 'ACTIVATED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

// ===== SNAPSHOT ENTITIES =====

export interface PaymentCustomerSnapshot {
  customerId: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  isGuest: boolean
  
  // Address for gift card delivery
  address?: {
    street: string
    city: string
    province: string
    postalCode: string
    country: string
  }
}

export interface PaymentCartSnapshot {
  items: PaymentCartItem[]
  subtotal: Money
  discountTotal: Money
  taxTotal: Money
  grandTotal: Money
}

export interface PaymentCartItem {
  id: string
  name: string
  quantity: number
  unitPrice: Money
  totalPrice: Money
  category?: string
  
  // For order conversion
  productId?: string
  variantId?: string
  isCustomItem: boolean
}

export interface PaymentDiscount {
  id: string
  name: string
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'COUPON'
  value: number
  discountAmount: Money
  couponCode?: string
  source: 'MANUAL' | 'AUTOMATIC' | 'COUPON'
}

// ===== PAYMENT REQUEST ENTITIES =====

export interface TransactionRequest {
  // Customer information
  customer?: PaymentCustomerData
  createGuestCustomer: boolean
  
  // Payment methods
  paymentMethods: PaymentMethodRequest[]
  
  // Cart data
  cartItems: PaymentCartItem[]
  appliedDiscounts: PaymentDiscount[]
  
  // Totals
  totals: {
    subtotal: Money
    discountTotal: Money
    taxTotal: Money
    grandTotal: Money
  }
  
  // Gift card data
  giftCards: GiftCardRequest[]
  
  // Metadata
  notes?: string
  employeeId?: string
  source: 'POS' | 'TAKEORDER' | 'ADMIN'
}

export interface PaymentMethodRequest {
  type: PaymentMethodType
  amount: Money
  
  // Card payment details
  cardDetails?: {
    paymentMethodId?: string // Stripe
    token?: string // Square
    saveCard: boolean
  }
  
  // Cash payment details
  cashDetails?: {
    amountTendered: Money
  }
  
  // Gift card details
  giftCardDetails?: {
    cardNumber: string
    verificationCode?: string
  }
  
  // PayPal payment details (future website integration)
  paypalDetails?: {
    orderId?: string // PayPal order ID
    payerId?: string // PayPal payer ID
    returnUrl?: string // Return URL after payment
    cancelUrl?: string // Cancel URL
  }
}

export interface PaymentCustomerData {
  id?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: {
    street: string
    city: string
    province: string
    postalCode: string
    country: string
  }
}

export interface GiftCardRequest {
  amount: Money
  customerName?: string
  customerEmail?: string
  deliveryMethod: GiftCardDeliveryMethod
  message?: string
}

// ===== PAYMENT RESPONSE ENTITIES =====

export interface TransactionResult {
  success: boolean
  transactionId: string
  transactionNumber: string
  
  // Payment results
  paymentResults: PaymentMethodResult[]
  
  // Gift card results
  giftCardResults: GiftCardResult[]
  
  // Customer information
  customerId: string
  
  // Error information
  errors: PaymentError[]
  warnings: string[]
  
  // Transaction totals
  totalProcessed: Money
  totalFailed: Money
  
  // Metadata
  processedAt: Date
  processingTime: number // milliseconds
}

export interface PaymentMethodResult {
  type: PaymentMethodType
  provider: PaymentProvider
  amount: Money
  status: PaymentMethodStatus
  
  // Success details
  providerTransactionId?: string
  authorizationCode?: string
  
  // Error details
  errorCode?: string
  errorMessage?: string
  
  // Receipt information
  receiptData?: {
    cardLast4?: string
    cardBrand?: string
    authCode?: string
    transactionId: string
  }
}

export interface GiftCardResult {
  cardNumber: string
  amount: Money
  status: GiftCardStatus
  activationCode?: string
  errorMessage?: string
  
  // Delivery details
  deliveryMethod: GiftCardDeliveryMethod
  deliveryAddress?: string
  deliveryStatus?: 'PENDING' | 'SENT' | 'FAILED'
}

export interface PaymentError {
  code: string
  message: string
  type: PaymentErrorType
  provider?: PaymentProvider
  
  // Error context
  paymentMethodType?: PaymentMethodType
  amount?: Money
  
  // Retry information
  isRetryable: boolean
  suggestedAction?: string
}

export enum PaymentErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  CARD_DECLINED = 'CARD_DECLINED',
  GIFT_CARD_ERROR = 'GIFT_CARD_ERROR',
  CUSTOMER_ERROR = 'CUSTOMER_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

// ===== PAYMENT VALIDATION =====

export interface PaymentValidationRule {
  name: string
  validate: (transaction: TransactionRequest) => PaymentValidationResult
}

export interface PaymentValidationResult {
  isValid: boolean
  errors: PaymentValidationError[]
  warnings: string[]
}

export interface PaymentValidationError {
  field: string
  code: string
  message: string
  severity: 'ERROR' | 'WARNING'
}

// ===== PAYMENT ANALYTICS =====

export interface PaymentAnalytics {
  // Transaction metrics
  totalTransactions: number
  totalRevenue: Money
  averageTransactionValue: Money
  
  // Payment method breakdown
  paymentMethodStats: Array<{
    type: PaymentMethodType
    provider: PaymentProvider
    count: number
    totalAmount: Money
    percentage: number
  }>
  
  // Success rates
  successRate: number
  failureRate: number
  errorsByType: Record<PaymentErrorType, number>
  
  // Processing times
  averageProcessingTime: number
  processingTimeByProvider: Record<PaymentProvider, number>
  
  // Gift card metrics
  giftCardsActivated: number
  giftCardRevenue: Money
  
  // Time period
  periodStart: Date
  periodEnd: Date
}

// ===== TYPE GUARDS AND UTILITIES =====

export const isCardPayment = (method: PaymentMethodUsed): boolean => {
  return method.type === PaymentMethodType.CARD || 
         method.type === PaymentMethodType.CREDIT || 
         method.type === PaymentMethodType.DEBIT
}

export const isCashPayment = (method: PaymentMethodUsed): boolean => {
  return method.type === PaymentMethodType.CASH
}

export const isGiftCardPayment = (method: PaymentMethodUsed): boolean => {
  return method.type === PaymentMethodType.GIFT_CARD
}

export const isSuccessfulTransaction = (transaction: PaymentTransaction): boolean => {
  return transaction.paymentStatus === PaymentStatus.COMPLETED
}

export const hasGiftCards = (transaction: PaymentTransaction): boolean => {
  return transaction.giftCards.length > 0
}

export const getTotalProcessingTime = (transaction: PaymentTransaction): number => {
  if (!transaction.completedAt) return 0
  return transaction.completedAt.getTime() - transaction.createdAt.getTime()
}

export const getProviderForPaymentMethod = (methodType: PaymentMethodType): PaymentProvider => {
  switch (methodType) {
    case PaymentMethodType.CASH:
      return PaymentProvider.CASH
    case PaymentMethodType.GIFT_CARD:
      return PaymentProvider.GIFT_CARD
    case PaymentMethodType.PAYPAL:
      return PaymentProvider.PAYPAL
    case PaymentMethodType.CARD:
    case PaymentMethodType.CREDIT:
    case PaymentMethodType.DEBIT:
      return PaymentProvider.STRIPE // Default for cards, could be dynamic
    default:
      return PaymentProvider.STRIPE
  }
}