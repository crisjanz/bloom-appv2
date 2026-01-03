/**
 * Orders Domain Entity
 * Unified order system for POS, delivery, events, and future subscriptions
 */

import { DomainEntity, Address, Money, Channel } from '@shared/types/common'

// Main Order entity - handles all order types
export interface Order extends DomainEntity {
  // Order identification
  orderNumber: string // Human-readable (e.g., "12345")
  internalId: string  // System ID for database relationships
  
  // Order relationships
  customerId: string
  employeeId?: string // Staff member who created the order
  
  // Order classification
  orderType: OrderType
  channel: Channel // POS, WEBSITE, PHONE, EMAIL
  status: OrderStatus
  orderSource: OrderSource // How the order was initiated (PHONE, WALKIN, EXTERNAL, WEBSITE, POS)

  // Order contents
  items: OrderItem[]
  
  // Financial information
  subtotal: Money
  taxBreakdown: TaxDetail[]
  appliedDiscounts: AppliedDiscount[]
  deliveryFee: Money
  tips: Money
  totalAmount: Money
  
  // Delivery/fulfillment information
  fulfillmentType: FulfillmentType
  deliveryInfo?: DeliveryInfo
  pickupInfo?: PickupInfo
  
  // Payment tracking
  paymentTransactionId?: string // Links to PT-XXXX system
  paymentStatus: PaymentStatus
  paidAt?: Date
  
  // Scheduling
  orderDate: Date
  requestedDeliveryDate?: Date
  scheduledDeliveryDate?: Date
  completedAt?: Date
  
  // Communication
  cardMessage?: string
  specialInstructions?: string
  internalNotes?: string
  occasion?: string

  // Customer information snapshot (for historical records)
  customerSnapshot: CustomerSnapshot
  
  // Metadata
  tags?: string[]
  priority: OrderPriority
  source?: string // 'website', 'pos', 'phone', 'repeat_order'
  
  // Analytics tracking
  acquisitionChannel?: string
  campaignId?: string
  referralCode?: string
}

// Order types for different business scenarios
export enum OrderType {
  REGULAR = 'REGULAR',           // Standard flower order
  DELIVERY = 'DELIVERY',         // Delivery order
  PICKUP = 'PICKUP',            // Customer pickup
  EVENT = 'EVENT',              // Wedding/event order
  SUBSCRIPTION = 'SUBSCRIPTION', // Recurring subscription order
  CORPORATE = 'CORPORATE',       // Corporate/bulk order
  RUSH = 'RUSH',                // Rush/same-day order
  CUSTOM = 'CUSTOM'             // Custom arrangement
}

// Comprehensive order status workflow
export enum OrderStatus {
  // Initial states
  DRAFT = 'DRAFT',                    // Order being created
  PENDING_PAYMENT = 'PENDING_PAYMENT', // Awaiting payment
  
  // Payment confirmed states
  PAID = 'PAID',                      // Payment confirmed
  CONFIRMED = 'CONFIRMED',             // Order confirmed by staff
  
  // Production states
  IN_DESIGN = 'IN_DESIGN',            // Being designed/created
  IN_PRODUCTION = 'IN_PRODUCTION',     // Being assembled
  QUALITY_CHECK = 'QUALITY_CHECK',     // Quality control
  
  // Ready states
  READY_FOR_PICKUP = 'READY_FOR_PICKUP', // Ready for customer pickup
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY', // Ready for delivery
  
  // Fulfillment states
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY', // En route to customer
  DELIVERED = 'DELIVERED',                // Successfully delivered
  PICKED_UP = 'PICKED_UP',               // Customer picked up
  
  // Final states
  COMPLETED = 'COMPLETED',               // Order fully completed
  
  // Exception states
  CANCELLED = 'CANCELLED',               // Cancelled by customer/staff
  REJECTED = 'REJECTED',                 // Rejected (quality/availability)
  FAILED_DELIVERY = 'FAILED_DELIVERY',   // Delivery attempt failed
  REFUNDED = 'REFUNDED',                 // Order refunded
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED' // Order partially refunded
}

// Order source channels
export enum OrderSource {
  PHONE = 'PHONE',       // Phone order
  WALKIN = 'WALKIN',     // Walk-in customer
  EXTERNAL = 'EXTERNAL', // External provider order (FTD, DoorDash, etc.)
  WEBSITE = 'WEBSITE',   // Online website order
  POS = 'POS'           // Point of sale (in-store)
}

// Payment status tracking
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

// Fulfillment methods
export enum FulfillmentType {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
  INSTALLATION = 'INSTALLATION', // For events
  SUBSCRIPTION_DELIVERY = 'SUBSCRIPTION_DELIVERY'
}

// Order priority levels
export enum OrderPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  RUSH = 'RUSH'
}

// Individual order items
export interface OrderItem {
  id: string
  
  // Product information
  productId: string
  variantId?: string
  sku?: string
  
  // Item details
  name: string
  description?: string
  category?: string
  
  // Pricing
  unitPrice: Money
  quantity: number
  totalPrice: Money
  originalPrice?: Money // Before discounts
  
  // Customization
  customizations?: ProductCustomization[]
  personalizedMessage?: string
  
  // Production information
  productionNotes?: string
  productionStatus?: ProductionStatus
  productionTime?: number // Minutes
  
  // Metadata
  isTaxable: boolean
  isGiftCard: boolean
  isCustomItem: boolean
  
  // Tracking
  addedAt: Date
  addedBy?: string // Employee ID
}

// Product customization options
export interface ProductCustomization {
  type: CustomizationType
  name: string
  value: string
  additionalCost?: Money
}

export enum CustomizationType {
  COLOR = 'COLOR',
  SIZE = 'SIZE',
  STYLE = 'STYLE',
  FLOWER_TYPE = 'FLOWER_TYPE',
  RIBBON = 'RIBBON',
  CONTAINER = 'CONTAINER',
  ADD_ON = 'ADD_ON',
  SPECIAL_REQUEST = 'SPECIAL_REQUEST'
}

// Production status for items
export enum ProductionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED'
}

// Tax calculation details
export interface TaxDetail {
  taxType: string // 'GST', 'PST', 'HST', etc.
  taxRate: number // 0.05 for 5%
  taxableAmount: Money
  taxAmount: Money
}

// Applied discount information
export interface AppliedDiscount {
  id: string
  discountId?: string // Reference to Discount entity
  
  // Discount details
  name: string
  type: DiscountType
  value: number
  description?: string
  
  // Application details
  appliedTo: 'ORDER' | 'ITEM' | 'DELIVERY'
  appliedAmount: Money
  itemIds?: string[] // If applied to specific items
  
  // Metadata
  appliedAt: Date
  appliedBy?: string // Employee ID or 'SYSTEM'
  source: 'MANUAL' | 'AUTOMATIC' | 'COUPON' | 'LOYALTY'
  couponCode?: string
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
  LOYALTY_POINTS = 'LOYALTY_POINTS'
}

// Delivery information
export interface DeliveryInfo {
  // Recipient details
  recipientName: string
  recipientPhone?: string
  recipientEmail?: string
  
  // Delivery address
  deliveryAddress: Address
  
  // Scheduling
  requestedDate?: Date
  requestedTimeSlot?: TimeSlot
  scheduledDate?: Date
  scheduledTimeSlot?: TimeSlot
  
  // Instructions
  deliveryInstructions?: string
  accessInstructions?: string
  
  // Status tracking
  driverAssigned?: string
  deliveryRoute?: string
  estimatedDeliveryTime?: Date
  actualDeliveryTime?: Date
  deliveryAttempts: DeliveryAttempt[]
  
  // Proof of delivery
  deliveryPhoto?: string
  recipientSignature?: string
  deliveredTo?: string
}

// Pickup information
export interface PickupInfo {
  // Pickup details
  pickupLocation: string
  pickupDate?: Date
  pickupTimeSlot?: TimeSlot
  
  // Customer notification
  readyNotificationSent?: Date
  pickupReminderSent?: Date
  
  // Pickup completion
  pickedUpAt?: Date
  pickedUpBy?: string
  employeeWhoHandedOrder?: string
  
  // Special instructions
  pickupInstructions?: string
}

// Time slot for scheduling
export interface TimeSlot {
  start: string // 'HH:MM' format
  end: string   // 'HH:MM' format
  label?: string // 'Morning', 'Afternoon', 'Evening'
}

// Delivery attempt tracking
export interface DeliveryAttempt {
  attemptNumber: number
  attemptDate: Date
  result: DeliveryAttemptResult
  notes?: string
  nextAttemptScheduled?: Date
}

export enum DeliveryAttemptResult {
  SUCCESSFUL = 'SUCCESSFUL',
  NO_ANSWER = 'NO_ANSWER',
  REFUSED = 'REFUSED',
  ADDRESS_ISSUE = 'ADDRESS_ISSUE',
  RECIPIENT_NOT_AVAILABLE = 'RECIPIENT_NOT_AVAILABLE',
  WEATHER_DELAY = 'WEATHER_DELAY',
  OTHER = 'OTHER'
}

// Customer information snapshot
export interface CustomerSnapshot {
  customerId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  customerType: string
  
  // For historical reference
  loyaltyPointsAtOrder?: number
  totalOrdersAtTime?: number
  lifetimeValueAtTime?: Money
}

// Order creation data
export interface CreateOrderData {
  customerId: string
  orderType: OrderType
  fulfillmentType: FulfillmentType
  items: Omit<OrderItem, 'id' | 'addedAt'>[]
  orderSource?: OrderSource // How the order was initiated (defaults to PHONE)

  // Optional fields
  requestedDeliveryDate?: Date
  deliveryInfo?: Partial<DeliveryInfo>
  pickupInfo?: Partial<PickupInfo>
  cardMessage?: string
  specialInstructions?: string
  internalNotes?: string
  priority?: OrderPriority

  // Payment information
  paymentTransactionId?: string

  // Metadata
  tags?: string[]
  source?: string
  campaignId?: string
}

// Order update data
export interface UpdateOrderData {
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  orderSource?: OrderSource
  items?: OrderItem[]
  deliveryInfo?: Partial<DeliveryInfo>
  pickupInfo?: Partial<PickupInfo>
  scheduledDeliveryDate?: Date
  internalNotes?: string
  priority?: OrderPriority
  paymentTransactionId?: string
  paidAt?: Date
  completedAt?: Date
  subtotal?: Money
  taxBreakdown?: TaxDetail[]
  appliedDiscounts?: AppliedDiscount[]
  deliveryFee?: Money
  tips?: Money
  totalAmount?: Money
}

// Order search and filtering
export interface OrderSearchCriteria {
  query?: string // Order number, customer name, phone
  status?: OrderStatus[]
  orderType?: OrderType[]
  fulfillmentType?: FulfillmentType[]
  paymentStatus?: PaymentStatus[]
  limit?: number
  offset?: number
  
  // Date ranges
  orderDateFrom?: Date
  orderDateTo?: Date
  deliveryDateFrom?: Date
  deliveryDateTo?: Date
  
  // Customer filters
  customerId?: string
  customerType?: string
  
  // Employee filters
  employeeId?: string
  
  // Financial filters
  minAmount?: number
  maxAmount?: number
  
  // Location filters
  city?: string
  province?: string
  postalCode?: string
  
  // Metadata filters
  tags?: string[]
  priority?: OrderPriority[]
  source?: string
  channel?: Channel[]
}

// Order statistics for analytics
export interface OrderStats {
  totalOrders: number
  totalRevenue: Money
  averageOrderValue: Money
  
  // By status
  ordersByStatus: Record<OrderStatus, number>
  
  // By type
  ordersByType: Record<OrderType, number>
  
  // By channel
  ordersByChannel: Record<Channel, number>
  
  // Time-based metrics
  ordersToday: number
  ordersThisWeek: number
  ordersThisMonth: number
  
  // Performance metrics
  averageProcessingTime: number // minutes
  onTimeDeliveryRate: number // percentage
  customerSatisfactionScore?: number
}

// Status transition validation
// NOTE: Allows backward transitions for operational flexibility (staff can correct mistakes)
const ENFORCE_STRICT_STATUS_TRANSITIONS = false

export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED],
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.CONFIRMED, OrderStatus.IN_DESIGN, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.IN_DESIGN, OrderStatus.IN_PRODUCTION, OrderStatus.PAID], // Can go back to PAID
  [OrderStatus.IN_DESIGN]: [OrderStatus.IN_PRODUCTION, OrderStatus.QUALITY_CHECK, OrderStatus.READY_FOR_PICKUP, OrderStatus.READY_FOR_DELIVERY, OrderStatus.REJECTED, OrderStatus.CANCELLED, OrderStatus.PAID], // Can go back to PAID
  [OrderStatus.IN_PRODUCTION]: [OrderStatus.QUALITY_CHECK, OrderStatus.READY_FOR_PICKUP, OrderStatus.READY_FOR_DELIVERY, OrderStatus.IN_DESIGN, OrderStatus.CANCELLED], // Can go back to IN_DESIGN
  [OrderStatus.QUALITY_CHECK]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.READY_FOR_DELIVERY, OrderStatus.IN_PRODUCTION, OrderStatus.IN_DESIGN], // Can go back
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.PICKED_UP, OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.IN_PRODUCTION, OrderStatus.IN_DESIGN], // Can go back
  [OrderStatus.READY_FOR_DELIVERY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.IN_PRODUCTION, OrderStatus.IN_DESIGN], // Can go back
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.FAILED_DELIVERY, OrderStatus.CANCELLED, OrderStatus.READY_FOR_DELIVERY, OrderStatus.IN_DESIGN], // Can go back
  [OrderStatus.PICKED_UP]: [OrderStatus.COMPLETED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
  [OrderStatus.FAILED_DELIVERY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REJECTED]: [OrderStatus.IN_DESIGN, OrderStatus.CANCELLED],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.PARTIALLY_REFUNDED]: [OrderStatus.REFUNDED]
}

// Type guards and utility functions
export const isDeliveryOrder = (order: Order): boolean => {
  return order.fulfillmentType === FulfillmentType.DELIVERY
}

export const isPickupOrder = (order: Order): boolean => {
  return order.fulfillmentType === FulfillmentType.PICKUP
}

export const isCompletedOrder = (order: Order): boolean => {
  return order.status === OrderStatus.COMPLETED
}

export const isActiveOrder = (order: Order): boolean => {
  return ![
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.REJECTED,
    OrderStatus.REFUNDED,
    OrderStatus.PARTIALLY_REFUNDED
  ].includes(order.status)
}

export const canTransitionTo = (currentStatus: OrderStatus, newStatus: OrderStatus): boolean => {
  if (!ENFORCE_STRICT_STATUS_TRANSITIONS) {
    return true
  }
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false
}

export const getOrderDisplayStatus = (order: Order): string => {
  // Business-friendly status names
  const statusDisplayNames: Record<OrderStatus, string> = {
    [OrderStatus.DRAFT]: 'Draft',
    [OrderStatus.PENDING_PAYMENT]: 'Pending Payment',
    [OrderStatus.PAID]: 'Paid',
    [OrderStatus.CONFIRMED]: 'Confirmed',
    [OrderStatus.IN_DESIGN]: 'In Design',
    [OrderStatus.IN_PRODUCTION]: 'In Production',
    [OrderStatus.QUALITY_CHECK]: 'Quality Check',
    [OrderStatus.READY_FOR_PICKUP]: 'Ready for Pickup',
    [OrderStatus.READY_FOR_DELIVERY]: 'Ready for Delivery',
    [OrderStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
    [OrderStatus.DELIVERED]: 'Delivered',
    [OrderStatus.PICKED_UP]: 'Picked Up',
    [OrderStatus.COMPLETED]: 'Completed',
    [OrderStatus.CANCELLED]: 'Cancelled',
    [OrderStatus.REJECTED]: 'Rejected',
    [OrderStatus.FAILED_DELIVERY]: 'Failed Delivery',
    [OrderStatus.REFUNDED]: 'Refunded',
    [OrderStatus.PARTIALLY_REFUNDED]: 'Partially Refunded'
  }
  
  return statusDisplayNames[order.status] || order.status
}
