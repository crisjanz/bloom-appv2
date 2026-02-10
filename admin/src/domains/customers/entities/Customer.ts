/**
 * Customer Domain Entity
 * Designed for both current POS needs and future website/subscription features
 */

import { DomainEntity, Address, EntityStatus } from '@shared/types/common'

// Main Customer entity - future-ready design
export interface Customer extends DomainEntity {
  // POS needs (current implementation)
  firstName: string
  lastName: string
  phone: string
  
  // Website needs (future-ready)
  email?: string
  passwordHash?: string
  emailVerified?: boolean
  
  // Profile information
  dateOfBirth?: Date
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  avatar?: string
  
  // Subscription needs (future-ready)
  loyaltyPoints?: number
  subscriptions?: string[] // subscription IDs
  accountBalance?: number // For house accounts
  
  // Marketing and preferences (future-ready)
  preferences?: CustomerPreferences
  communicationConsents?: ConsentRecord[]
  
  // Addresses and payment methods
  addresses?: Address[]
  paymentMethods?: SavedPaymentMethod[]
  
  // Customer status and metadata
  status: EntityStatus
  customerType: CustomerType
  tags?: string[]
  notes?: string
  
  // Analytics and tracking (future-ready)
  totalSpent?: number
  orderCount?: number
  averageOrderValue?: number
  lastOrderDate?: Date
  acquisitionChannel?: string
  
  // Business relationships
  isVip?: boolean
  businessName?: string
  taxExempt?: boolean
  creditLimit?: number
}

// Customer preferences for personalization
export interface CustomerPreferences {
  // Communication preferences
  emailNotifications: boolean
  smsNotifications: boolean
  phoneCallsAllowed: boolean
  
  // Marketing preferences
  promotionalEmails: boolean
  birthdayOffers: boolean
  seasonalPromotions: boolean
  
  // Product preferences
  favoriteFlowers: string[]
  favoriteColors: string[]
  allergies?: string[]
  
  // Delivery preferences
  preferredDeliveryTime?: 'morning' | 'afternoon' | 'evening'
  deliveryInstructions?: string
  
  // Website preferences (future)
  language?: string
  currency?: string
  theme?: 'light' | 'dark' | 'auto'
}

// Consent tracking for GDPR/privacy compliance
export interface ConsentRecord {
  consentType: ConsentType
  granted: boolean
  grantedAt: Date
  revokedAt?: Date
  ipAddress?: string
  source: string // 'website', 'pos', 'phone', etc.
}

export enum ConsentType {
  EMAIL_MARKETING = 'EMAIL_MARKETING',
  SMS_MARKETING = 'SMS_MARKETING',
  DATA_PROCESSING = 'DATA_PROCESSING',
  DATA_SHARING = 'DATA_SHARING',
  COOKIES = 'COOKIES',
  ANALYTICS = 'ANALYTICS'
}

// Saved payment methods (cross-provider)
export interface SavedPaymentMethod {
  id: string
  customerId: string
  provider: PaymentProvider // 'STRIPE', 'SQUARE'
  providerCustomerId: string
  providerPaymentMethodId: string
  
  // Card information (masked)
  cardLast4: string
  cardBrand: string
  cardExpMonth: number
  cardExpYear: number
  
  // Metadata
  isDefault: boolean
  nickname?: string // "My Visa Card", "Business Card"
  billingAddress?: Address
  
  createdAt: Date
  updatedAt: Date
}

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  SQUARE = 'SQUARE',
  PAYPAL = 'PAYPAL' // Future
}

// Customer types for business logic
export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUSINESS = 'BUSINESS',
  WALK_IN = 'WALK_IN',
  ONLINE = 'ONLINE',
  SUBSCRIPTION = 'SUBSCRIPTION'
}

// Customer creation data (for forms)
export interface CreateCustomerData {
  firstName: string
  lastName: string
  phone?: string
  email?: string
  customerType?: CustomerType
  businessName?: string
  primaryAddress?: Omit<Address, 'id'>
  preferences?: Partial<CustomerPreferences>
  tags?: string[]
  notes?: string
}

// Customer update data
export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  status?: EntityStatus
  loyaltyPoints?: number
  accountBalance?: number
  subscriptions?: string[]
  orderCount?: number
  totalSpent?: number
  averageOrderValue?: number
  lastOrderDate?: Date
}

// Customer search criteria
export interface CustomerSearchCriteria {
  query?: string // Search name, email, phone
  customerType?: CustomerType
  status?: EntityStatus
  tags?: string[]
  city?: string
  province?: string
  hasSubscriptions?: boolean
  vipOnly?: boolean
  createdAfter?: Date
  createdBefore?: Date
  totalSpentMin?: number
  totalSpentMax?: number
}

// Customer statistics for analytics
export interface CustomerStats {
  totalCustomers: number
  newCustomersThisMonth: number
  vipCustomers: number
  subscriptionCustomers: number
  averageLifetimeValue: number
  topSpendingCustomers: Customer[]
  customersByProvince: Record<string, number>
  customersByType: Record<CustomerType, number>
}

// Customer activity tracking
export interface CustomerActivity {
  customerId: string
  activityType: CustomerActivityType
  description: string
  metadata?: Record<string, any>
  timestamp: Date
  employeeId?: string
}

export enum CustomerActivityType {
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  ORDER_PLACED = 'ORDER_PLACED',
  PAYMENT_METHOD_ADDED = 'PAYMENT_METHOD_ADDED',
  SUBSCRIPTION_STARTED = 'SUBSCRIPTION_STARTED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  LOYALTY_POINTS_EARNED = 'LOYALTY_POINTS_EARNED',
  LOYALTY_POINTS_REDEEMED = 'LOYALTY_POINTS_REDEEMED',
  COMMUNICATION_CONSENT_CHANGED = 'COMMUNICATION_CONSENT_CHANGED',
  SUPPORT_INTERACTION = 'SUPPORT_INTERACTION',
  LOGIN = 'LOGIN', // Future website
  PASSWORD_RESET = 'PASSWORD_RESET' // Future website
}

// Type guards for better type safety
export const isWalkInCustomer = (customer: Customer): boolean => {
  return customer.customerType === CustomerType.WALK_IN ||
         (customer.firstName === 'Walk-in' && customer.lastName === 'Customer')
}

export const isBusinessCustomer = (customer: Customer): boolean => {
  return customer.customerType === CustomerType.BUSINESS || !!customer.businessName
}

export const hasValidEmail = (customer: Customer): boolean => {
  return !!customer.email && customer.email.includes('@')
}

export const hasValidPhone = (customer: Customer): boolean => {
  return !!customer.phone && customer.phone.length >= 10
}

export const canReceiveMarketing = (customer: Customer): boolean => {
  return customer.communicationConsents?.some(
    consent => consent.consentType === ConsentType.EMAIL_MARKETING && 
               consent.granted && 
               !consent.revokedAt
  ) ?? false
}
