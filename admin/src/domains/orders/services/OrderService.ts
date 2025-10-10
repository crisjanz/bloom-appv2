/**
 * Orders Domain Service
 * Business logic for order management across all channels (POS, delivery, events, subscriptions)
 */

import { DomainService, Result } from '@shared/types/common'
import { Order, OrderItem, OrderStatus, OrderType, FulfillmentType, OrderPriority, PaymentStatus, CreateOrderData, UpdateOrderData, OrderSearchCriteria, OrderStats, canTransitionTo } from '../entities/Order'
import { OrderRepository } from '../repositories/OrderRepository'
import { Customer } from '../../customers/entities/Customer'

export class OrderService implements DomainService<Order> {
  constructor(private orderRepository: OrderRepository) {}

  // ===== CORE CRUD OPERATIONS =====

  async create(orderData: CreateOrderData): Promise<Order> {
    // Generate order number
    const orderNumber = await this.generateOrderNumber()
    
    // Calculate financial totals
    const financials = this.calculateOrderFinancials(orderData.items)
    
    // Create customer snapshot
    const customerSnapshot = await this.createCustomerSnapshot(orderData.customerId)
    
    const order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
      // Order identification
      orderNumber,
      internalId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      
      // Relationships
      customerId: orderData.customerId,
      employeeId: orderData.source === 'pos' ? 'current-employee-id' : undefined, // TODO: Get from auth context
      
      // Classification
      orderType: orderData.orderType,
      channel: this.determineChannel(orderData.source),
      status: orderData.paymentTransactionId ? OrderStatus.PAID : OrderStatus.PENDING_PAYMENT,
      
      // Contents
      items: this.processOrderItems(orderData.items),
      
      // Financial information
      subtotal: financials.subtotal,
      taxBreakdown: financials.taxBreakdown,
      appliedDiscounts: [], // Will be populated by discount service
      deliveryFee: financials.deliveryFee,
      tips: { amount: 0, currency: 'CAD' },
      totalAmount: financials.totalAmount,
      
      // Fulfillment
      fulfillmentType: orderData.fulfillmentType,
      deliveryInfo: orderData.deliveryInfo,
      pickupInfo: orderData.pickupInfo,
      
      // Payment
      paymentTransactionId: orderData.paymentTransactionId,
      paymentStatus: orderData.paymentTransactionId ? PaymentStatus.PAID : PaymentStatus.PENDING,
      paidAt: orderData.paymentTransactionId ? new Date() : undefined,
      
      // Scheduling
      orderDate: new Date(),
      requestedDeliveryDate: orderData.requestedDeliveryDate,
      scheduledDeliveryDate: undefined,
      completedAt: undefined,
      
      // Communication
      cardMessage: orderData.cardMessage,
      specialInstructions: orderData.specialInstructions,
      internalNotes: orderData.internalNotes,
      
      // Customer snapshot
      customerSnapshot,
      
      // Metadata
      tags: orderData.tags || [],
      priority: orderData.priority || OrderPriority.NORMAL,
      source: orderData.source,
      
      // Analytics
      acquisitionChannel: this.determineAcquisitionChannel(orderData.source),
      campaignId: orderData.campaignId,
      referralCode: undefined // TODO: Extract from customer or campaign
    }

    return await this.orderRepository.create(order)
  }

  async findById(id: string): Promise<Order | null> {
    return await this.orderRepository.findById(id)
  }

  async update(id: string, updates: UpdateOrderData): Promise<Order> {
    const existing = await this.orderRepository.findById(id)
    if (!existing) {
      throw new Error(`Order ${id} not found`)
    }

    // Validate status transitions
    if (updates.status && !canTransitionTo(existing.status, updates.status)) {
      throw new Error(`Cannot transition from ${existing.status} to ${updates.status}`)
    }

    // Recalculate totals if items changed
    if (updates.items) {
      const financials = this.calculateOrderFinancials(updates.items)
      updates = {
        ...updates,
        ...financials
      }
    }

    return await this.orderRepository.update(id, updates)
  }

  async delete(id: string): Promise<void> {
    // Soft delete - mark as cancelled
    await this.update(id, { status: OrderStatus.CANCELLED })
  }

  // ===== POS-SPECIFIC OPERATIONS =====

  /**
   * Create POS order from cart
   */
  async createPOSOrder(cartData: {
    customerId: string
    items: Omit<OrderItem, 'id' | 'addedAt'>[]
    fulfillmentType: FulfillmentType
    deliveryInfo?: any
    pickupInfo?: any
    paymentTransactionId?: string
    specialInstructions?: string
  }): Promise<Order> {
    return await this.create({
      customerId: cartData.customerId,
      orderType: OrderType.REGULAR,
      fulfillmentType: cartData.fulfillmentType,
      items: cartData.items,
      deliveryInfo: cartData.deliveryInfo,
      pickupInfo: cartData.pickupInfo,
      paymentTransactionId: cartData.paymentTransactionId,
      specialInstructions: cartData.specialInstructions,
      source: 'pos',
      priority: OrderPriority.NORMAL
    })
  }

  /**
   * Process payment for existing order (POS workflow)
   */
  async processPayment(orderId: string, paymentTransactionId: string): Promise<Order> {
    return await this.update(orderId, {
      paymentTransactionId,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.PAID
    })
  }

  /**
   * Mark order as confirmed (staff reviewed)
   */
  async confirmOrder(orderId: string, employeeId: string, notes?: string): Promise<Order> {
    const updates: UpdateOrderData = {
      status: OrderStatus.CONFIRMED
    }
    
    if (notes) {
      const existing = await this.findById(orderId)
      updates.internalNotes = existing?.internalNotes 
        ? `${existing.internalNotes}\n[${new Date().toISOString()}] ${employeeId}: ${notes}`
        : `[${new Date().toISOString()}] ${employeeId}: ${notes}`
    }

    return await this.update(orderId, updates)
  }

  // ===== DELIVERY OPERATIONS =====

  /**
   * Schedule order for delivery
   */
  async scheduleDelivery(orderId: string, scheduledDate: Date, timeSlot?: any): Promise<Order> {
    const deliveryInfo = timeSlot ? { scheduledTimeSlot: timeSlot } : {}
    return await this.update(orderId, { 
      scheduledDeliveryDate: scheduledDate,
      deliveryInfo,
      status: OrderStatus.READY_FOR_DELIVERY
    })
  }

  /**
   * Mark order as out for delivery
   */
  async markOutForDelivery(orderId: string, driverAssigned: string): Promise<Order> {
    const existing = await this.findById(orderId)
    if (!existing) throw new Error('Order not found')

    const deliveryInfo = {
      ...existing.deliveryInfo,
      driverAssigned,
      estimatedDeliveryTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    }

    return await this.update(orderId, {
      status: OrderStatus.OUT_FOR_DELIVERY,
      deliveryInfo
    })
  }

  /**
   * Mark order as delivered
   */
  async markDelivered(orderId: string, deliveryProof?: {
    photo?: string
    signature?: string
    deliveredTo?: string
    notes?: string
  }): Promise<Order> {
    const existing = await this.findById(orderId)
    if (!existing) throw new Error('Order not found')

    const deliveryInfo = {
      ...existing.deliveryInfo,
      actualDeliveryTime: new Date(),
      ...deliveryProof
    }

    return await this.update(orderId, {
      status: OrderStatus.DELIVERED,
      deliveryInfo,
      completedAt: new Date()
    })
  }

  /**
   * Record failed delivery attempt
   */
  async recordFailedDelivery(orderId: string, reason: string, notes?: string): Promise<Order> {
    const existing = await this.findById(orderId)
    if (!existing) throw new Error('Order not found')

    const deliveryAttempt = {
      attemptNumber: (existing.deliveryInfo?.deliveryAttempts?.length || 0) + 1,
      attemptDate: new Date(),
      result: 'FAILED' as any, // TODO: Use proper enum
      notes: `${reason}${notes ? ` - ${notes}` : ''}`
    }

    const deliveryInfo = {
      ...existing.deliveryInfo,
      deliveryAttempts: [...(existing.deliveryInfo?.deliveryAttempts || []), deliveryAttempt]
    }

    return await this.update(orderId, {
      status: OrderStatus.FAILED_DELIVERY,
      deliveryInfo
    })
  }

  // ===== PICKUP OPERATIONS =====

  /**
   * Mark order ready for pickup
   */
  async markReadyForPickup(orderId: string): Promise<Order> {
    return await this.update(orderId, {
      status: OrderStatus.READY_FOR_PICKUP
    })
  }

  /**
   * Mark order as picked up
   */
  async markPickedUp(orderId: string, pickedUpBy: string, employeeId: string): Promise<Order> {
    const existing = await this.findById(orderId)
    if (!existing) throw new Error('Order not found')

    const pickupInfo = {
      ...existing.pickupInfo,
      pickedUpAt: new Date(),
      pickedUpBy,
      employeeWhoHandedOrder: employeeId
    }

    return await this.update(orderId, {
      status: OrderStatus.PICKED_UP,
      pickupInfo,
      completedAt: new Date()
    })
  }

  // ===== PRODUCTION OPERATIONS =====

  /**
   * Move order to production
   */
  async startProduction(orderId: string, productionNotes?: string): Promise<Order> {
    return await this.update(orderId, {
      status: OrderStatus.IN_PRODUCTION,
      internalNotes: productionNotes
    })
  }

  /**
   * Move order to quality check
   */
  async moveToQualityCheck(orderId: string): Promise<Order> {
    return await this.update(orderId, {
      status: OrderStatus.QUALITY_CHECK
    })
  }

  /**
   * Complete production and mark ready
   */
  async completeProduction(orderId: string, fulfillmentType: FulfillmentType): Promise<Order> {
    const status = fulfillmentType === FulfillmentType.DELIVERY 
      ? OrderStatus.READY_FOR_DELIVERY 
      : OrderStatus.READY_FOR_PICKUP

    return await this.update(orderId, { status })
  }

  // ===== SEARCH AND FILTERING =====

  async search(criteria: OrderSearchCriteria): Promise<Order[]> {
    return await this.orderRepository.search(criteria)
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return await this.orderRepository.findByOrderNumber(orderNumber)
  }

  async findByCustomer(customerId: string, limit = 10): Promise<Order[]> {
    return await this.orderRepository.findByCustomer(customerId, limit)
  }

  async findByStatus(status: OrderStatus[]): Promise<Order[]> {
    return await this.orderRepository.findByStatus(status)
  }

  async findActiveOrders(): Promise<Order[]> {
    const activeStatuses = [
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAID,
      OrderStatus.CONFIRMED,
      OrderStatus.IN_DESIGN,
      OrderStatus.IN_PRODUCTION,
      OrderStatus.QUALITY_CHECK,
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.READY_FOR_DELIVERY,
      OrderStatus.OUT_FOR_DELIVERY
    ]
    return await this.findByStatus(activeStatuses)
  }

  async findTodaysOrders(): Promise<Order[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return await this.search({
      orderDateFrom: today,
      orderDateTo: tomorrow
    })
  }

  // ===== ANALYTICS AND REPORTING =====

  async getOrderStats(dateFrom?: Date, dateTo?: Date): Promise<OrderStats> {
    return await this.orderRepository.getOrderStats(dateFrom, dateTo)
  }

  async getRevenueByPeriod(period: 'day' | 'week' | 'month'): Promise<any> {
    // TODO: Implement revenue analytics
    return {}
  }

  // ===== UTILITY METHODS =====

  private async generateOrderNumber(): Promise<string> {
    // Simple incremental order numbers
    const lastOrder = await this.orderRepository.getLastOrder()
    const lastNumber = lastOrder ? parseInt(lastOrder.orderNumber) : 10000
    return (lastNumber + 1).toString()
  }

  private determineChannel(source?: string) {
    switch (source) {
      case 'pos': return 'POS'
      case 'website': return 'WEBSITE'
      case 'phone': return 'PHONE'
      default: return 'POS'
    }
  }

  private determineAcquisitionChannel(source?: string): string {
    switch (source) {
      case 'pos': return 'in-store'
      case 'website': return 'organic-web'
      case 'phone': return 'phone-order'
      default: return 'unknown'
    }
  }

  private calculateOrderFinancials(items: Omit<OrderItem, 'id' | 'addedAt'>[]) {
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice.amount * item.quantity), 0)
    
    // TODO: Integrate with tax service
    const taxRate = 0.13 // 13% HST in Ontario
    const taxAmount = subtotal * taxRate

    // TODO: Integrate with delivery service
    const deliveryFee = { amount: 0, currency: 'CAD' }

    return {
      subtotal: { amount: subtotal, currency: 'CAD' },
      taxBreakdown: [{
        taxType: 'HST',
        taxRate,
        taxableAmount: { amount: subtotal, currency: 'CAD' },
        taxAmount: { amount: taxAmount, currency: 'CAD' }
      }],
      deliveryFee,
      totalAmount: { amount: subtotal + taxAmount + deliveryFee.amount, currency: 'CAD' }
    }
  }

  private processOrderItems(items: Omit<OrderItem, 'id' | 'addedAt'>[]): OrderItem[] {
    return items.map(item => ({
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date(),
      totalPrice: { 
        amount: item.unitPrice.amount * item.quantity, 
        currency: item.unitPrice.currency 
      }
    }))
  }

  private async createCustomerSnapshot(customerId: string): Promise<any> {
    // TODO: Integrate with customer service to get snapshot
    return {
      customerId,
      firstName: 'Unknown',
      lastName: 'Customer',
      customerType: 'REGULAR',
      totalOrdersAtTime: 0,
      lifetimeValueAtTime: { amount: 0, currency: 'CAD' }
    }
  }

  // ===== EVENT OPERATIONS (Future) =====

  /**
   * Create event/wedding order with complex requirements
   */
  async createEventOrder(eventData: {
    customerId: string
    eventType: string
    eventDate: Date
    venue: string
    guestCount: number
    items: Omit<OrderItem, 'id' | 'addedAt'>[]
    specialRequirements?: string
  }): Promise<Order> {
    return await this.create({
      customerId: eventData.customerId,
      orderType: OrderType.EVENT,
      fulfillmentType: FulfillmentType.INSTALLATION,
      items: eventData.items,
      requestedDeliveryDate: eventData.eventDate,
      specialInstructions: `Event: ${eventData.eventType}\nVenue: ${eventData.venue}\nGuests: ${eventData.guestCount}\n${eventData.specialRequirements || ''}`,
      priority: OrderPriority.HIGH,
      source: 'event-manager',
      tags: ['event', eventData.eventType.toLowerCase()]
    })
  }

  // ===== SUBSCRIPTION OPERATIONS (Future) =====

  /**
   * Create recurring subscription order
   */
  async createSubscriptionOrder(subscriptionData: {
    customerId: string
    subscriptionId: string
    items: Omit<OrderItem, 'id' | 'addedAt'>[]
    deliveryAddress: any
    frequency: string
  }): Promise<Order> {
    return await this.create({
      customerId: subscriptionData.customerId,
      orderType: OrderType.SUBSCRIPTION,
      fulfillmentType: FulfillmentType.SUBSCRIPTION_DELIVERY,
      items: subscriptionData.items,
      deliveryInfo: { deliveryAddress: subscriptionData.deliveryAddress },
      source: 'subscription-system',
      tags: ['subscription', subscriptionData.frequency]
    })
  }
}