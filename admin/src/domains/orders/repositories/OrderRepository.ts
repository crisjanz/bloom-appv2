/**
 * Order Repository
 * Data access layer for order management with comprehensive querying capabilities
 */

import { BaseRepository } from '@shared/infrastructure/database/BaseRepository'
import { Order, OrderStatus, OrderSearchCriteria, OrderStats, FulfillmentType, OrderType, PaymentStatus } from '../entities/Order'
import { Money } from '@shared/types/common'

export class OrderRepository extends BaseRepository<Order> {
  protected readonly endpoint = '/api/orders'
  protected readonly entityName = 'Order'
  protected tableName = 'orders'

  // ===== STATUS MAPPING =====

  /**
   * Map frontend status values to backend database status values
   * Frontend has a more detailed workflow than the backend database
   */
  private mapStatusToBackend(frontendStatus: OrderStatus): string {
    switch (frontendStatus) {
      // Draft orders
      case OrderStatus.DRAFT:
        return 'DRAFT'

      // Payment states -> map to PAID or DRAFT
      case OrderStatus.PENDING_PAYMENT:
        return 'DRAFT' // Unpaid orders are still drafts in backend
      case OrderStatus.PAID:
        return 'PAID'

      // Confirmation and production states -> map to IN_DESIGN or READY
      case OrderStatus.CONFIRMED:
      case OrderStatus.IN_DESIGN:
        return 'IN_DESIGN'
      case OrderStatus.IN_PRODUCTION:
      case OrderStatus.QUALITY_CHECK:
        return 'IN_DESIGN' // Production phases are still "in design" in backend

      // Ready states -> map to READY
      case OrderStatus.READY_FOR_PICKUP:
      case OrderStatus.READY_FOR_DELIVERY:
        return 'READY'

      // Delivery states
      case OrderStatus.OUT_FOR_DELIVERY:
        return 'OUT_FOR_DELIVERY'

      // Completion states -> map to COMPLETED
      case OrderStatus.DELIVERED:
      case OrderStatus.PICKED_UP:
      case OrderStatus.COMPLETED:
        return 'COMPLETED'

      // Failure states
      case OrderStatus.CANCELLED:
        return 'CANCELLED'
      case OrderStatus.REJECTED:
        return 'REJECTED'

      // Fallback
      default:
        return 'DRAFT'
    }
  }

  /**
   * Map backend status to frontend status based on order type
   * Reverse of mapStatusToBackend - needs order type to determine READY -> READY_FOR_PICKUP vs READY_FOR_DELIVERY
   */
  private mapStatusToFrontend(backendStatus: string, fulfillmentType?: string): OrderStatus {
    switch (backendStatus) {
      case 'DRAFT':
        return OrderStatus.DRAFT
      case 'PAID':
        return OrderStatus.PAID
      case 'IN_DESIGN':
        return OrderStatus.IN_DESIGN
      case 'READY':
        // Determine if pickup or delivery based on fulfillment type
        return fulfillmentType === 'PICKUP' ? OrderStatus.READY_FOR_PICKUP : OrderStatus.READY_FOR_DELIVERY
      case 'OUT_FOR_DELIVERY':
        return OrderStatus.OUT_FOR_DELIVERY
      case 'COMPLETED':
        return OrderStatus.COMPLETED
      case 'CANCELLED':
        return OrderStatus.CANCELLED
      case 'REJECTED':
        return OrderStatus.REJECTED
      default:
        return OrderStatus.DRAFT
    }
  }

  /**
   * Transform backend order data to frontend Order entity
   */
  private transformOrder(backendOrder: any): Order {
    return {
      ...backendOrder,
      status: this.mapStatusToFrontend(backendOrder.status, backendOrder.type),
      fulfillmentType: backendOrder.type, // Backend 'type' (DELIVERY/PICKUP) maps to frontend 'fulfillmentType'
      orderType: backendOrder.type // Also map to orderType for compatibility
    } as Order
  }

  // ===== SPECIALIZED QUERIES =====

  /**
   * Override findById to handle backend response structure
   */
  async findById(id: string): Promise<Order | null> {
    const result = await this.customQuery<{success: boolean, order: any}>(`${id}`)
    return result.order ? this.transformOrder(result.order) : null
  }

  /**
   * Update order - uses the /update endpoint
   */
  async update(id: string, updates: Partial<Order>): Promise<Order> {
    // Map frontend status to backend status before sending to API
    const backendUpdates = { ...updates }
    if (updates.status) {
      backendUpdates.status = this.mapStatusToBackend(updates.status) as any
    }

    const result = await this.customMutation<{success: boolean, order: any}>(`${id}/update`, backendUpdates, 'PUT')
    return this.transformOrder(result.order)
  }

  /**
   * Override findMany to use the /list endpoint since backend doesn't have base GET /orders
   */
  async findMany(filter: any = {}): Promise<Order[]> {
    const params = new URLSearchParams()
    
    // Convert filter to backend parameters
    if (filter.limit) params.set('limit', filter.limit.toString())
    if (filter.offset) params.set('offset', filter.offset.toString())
    
    // Handle status filtering
    if (filter.where?.status?.in) {
      // For multiple statuses, delegate to findByStatus method
      return await this.findByStatus(filter.where.status.in)
    }
    if (filter.where?.status) {
      const backendStatus = this.mapStatusToBackend(filter.where.status)
      params.set('status', backendStatus)
    }
    // If no status filter, get all orders (don't set status parameter)

    // Call the orders list endpoint and handle the API response structure
    const result = await this.customQuery<{success: boolean, orders: any[], pagination?: any}>('list', Object.fromEntries(params))

    // Extract and transform the orders array from the API response
    const orders = result.orders || []
    return orders.map(order => this.transformOrder(order))
  }

  /**
   * Search orders with criteria
   */
  async search(criteria: OrderSearchCriteria): Promise<Order[]> {
    // Convert criteria to API query parameters
    const params = new URLSearchParams()

    if (criteria.query) {
      params.set('search', criteria.query)
    }
    if (criteria.status) {
      // Map frontend status to backend status
      const backendStatus = this.mapStatusToBackend(criteria.status)
      params.set('status', backendStatus)
    }
    if (criteria.orderDateFrom) {
      params.set('orderDateFrom', criteria.orderDateFrom.toISOString().split('T')[0])
    }
    if (criteria.orderDateTo) {
      params.set('orderDateTo', criteria.orderDateTo.toISOString().split('T')[0])
    }
    if (criteria.deliveryDateFrom) {
      params.set('deliveryDateFrom', criteria.deliveryDateFrom.toISOString().split('T')[0])
    }
    if (criteria.deliveryDateTo) {
      params.set('deliveryDateTo', criteria.deliveryDateTo.toISOString().split('T')[0])
    }
    if (criteria.limit) {
      params.set('limit', criteria.limit.toString())
    }
    if (criteria.offset) {
      params.set('offset', criteria.offset.toString())
    }

    // Call the orders list endpoint and handle the API response structure
    const result = await this.customQuery<{success: boolean, orders: any[], pagination?: any}>('list', Object.fromEntries(params))

    // Extract and transform the orders array from the API response
    const orders = result.orders || []
    return orders.map(order => this.transformOrder(order))
  }

  /**
   * Find order by human-readable order number
   */
  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    // In real implementation, this would query the database
    // For now, we'll use the base implementation
    const orders = await this.findMany({ 
      where: { orderNumber },
      limit: 1 
    })
    return orders[0] || null
  }

  /**
   * Find orders by customer with pagination
   */
  async findByCustomer(customerId: string, limit = 10, offset = 0): Promise<Order[]> {
    return await this.findMany({
      where: { customerId },
      orderBy: { field: 'orderDate', direction: 'DESC' },
      limit,
      offset
    })
  }

  /**
   * Find orders by status array
   */
  async findByStatus(statuses: OrderStatus[]): Promise<Order[]> {
    // Map frontend statuses to backend statuses and deduplicate
    const backendStatuses = [...new Set(statuses.map(status => this.mapStatusToBackend(status)))]

    // Since backend only supports single status, we'll make multiple calls and combine
    const allOrderResponses = await Promise.all(
      backendStatuses.map(status => this.customQuery<{success: boolean, orders: any[], pagination?: any}>('list', { status }))
    )

    // Extract orders arrays, transform, and flatten
    const orders = allOrderResponses
      .map(response => (response.orders || []).map(order => this.transformOrder(order)))
      .flat()

    // Deduplicate by order ID
    const uniqueOrders = orders.filter((order, index, self) =>
      index === self.findIndex(o => o.id === order.id)
    )

    // Sort by order date descending
    return uniqueOrders.sort((a, b) =>
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    )
  }

  /**
   * Get the most recent order (for order number generation)
   */
  async getLastOrder(): Promise<Order | null> {
    const orders = await this.findMany({
      orderBy: { field: 'orderNumber', direction: 'DESC' },
      limit: 1
    })
    return orders[0] || null
  }

  // ===== ADVANCED SEARCH =====
  // Note: Comprehensive search with query builder is template for future database-level implementation
  // Currently using API-based search method above

  // ===== ANALYTICS AND STATISTICS =====

  /**
   * Generate comprehensive order statistics
   */
  async getOrderStats(dateFrom?: Date, dateTo?: Date): Promise<OrderStats> {
    const queryBuilder = this.createQueryBuilder()
    
    // Apply date filters if provided
    if (dateFrom) {
      queryBuilder.where('orderDate', '>=', dateFrom)
    }
    if (dateTo) {
      queryBuilder.where('orderDate', '<=', dateTo)
    }

    const orders = await queryBuilder.execute()

    // Calculate basic metrics
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount.amount, 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Group by status
    const ordersByStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<OrderStatus, number>)

    // Group by type
    const ordersByType = orders.reduce((acc, order) => {
      acc[order.orderType] = (acc[order.orderType] || 0) + 1
      return acc
    }, {} as Record<OrderType, number>)

    // Group by channel
    const ordersByChannel = orders.reduce((acc, order) => {
      acc[order.channel] = (acc[order.channel] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Time-based metrics
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const ordersToday = orders.filter(order => order.orderDate >= today).length
    const ordersThisWeek = orders.filter(order => order.orderDate >= weekStart).length
    const ordersThisMonth = orders.filter(order => order.orderDate >= monthStart).length

    // Performance metrics
    const completedOrders = orders.filter(order => order.completedAt)
    const averageProcessingTime = this.calculateAverageProcessingTime(completedOrders)
    const onTimeDeliveryRate = this.calculateOnTimeDeliveryRate(
      orders.filter(order => order.fulfillmentType === FulfillmentType.DELIVERY)
    )

    return {
      totalOrders,
      totalRevenue: { amount: totalRevenue, currency: 'CAD' },
      averageOrderValue: { amount: averageOrderValue, currency: 'CAD' },
      ordersByStatus,
      ordersByType,
      ordersByChannel,
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      averageProcessingTime,
      onTimeDeliveryRate
    }
  }

  /**
   * Get orders for today's production schedule
   */
  async getTodaysProductionOrders(): Promise<Order[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return await this.search({
      status: [
        OrderStatus.CONFIRMED,
        OrderStatus.IN_DESIGN,
        OrderStatus.IN_PRODUCTION,
        OrderStatus.QUALITY_CHECK
      ],
      deliveryDateFrom: today,
      deliveryDateTo: tomorrow
    })
  }

  /**
   * Get orders requiring delivery today
   */
  async getTodaysDeliveryOrders(): Promise<Order[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return await this.search({
      fulfillmentType: [FulfillmentType.DELIVERY],
      status: [
        OrderStatus.READY_FOR_DELIVERY,
        OrderStatus.OUT_FOR_DELIVERY
      ],
      deliveryDateFrom: today,
      deliveryDateTo: tomorrow
    })
  }

  /**
   * Get orders ready for pickup
   */
  async getPickupReadyOrders(): Promise<Order[]> {
    return await this.findByStatus([OrderStatus.READY_FOR_PICKUP])
  }

  /**
   * Get overdue orders (past scheduled delivery date)
   */
  async getOverdueOrders(): Promise<Order[]> {
    const now = new Date()
    
    return await this.search({
      deliveryDateTo: now,
      status: [
        OrderStatus.CONFIRMED,
        OrderStatus.IN_DESIGN,
        OrderStatus.IN_PRODUCTION,
        OrderStatus.QUALITY_CHECK,
        OrderStatus.READY_FOR_DELIVERY,
        OrderStatus.READY_FOR_PICKUP
      ]
    })
  }

  // ===== BULK OPERATIONS =====

  /**
   * Bulk update order status (for batch processing)
   */
  async bulkUpdateStatus(orderIds: string[], newStatus: OrderStatus): Promise<void> {
    // In real implementation, this would be a single SQL UPDATE
    for (const orderId of orderIds) {
      await this.update(orderId, { status: newStatus })
    }
  }

  /**
   * Archive completed orders older than specified days
   */
  async archiveOldOrders(daysOld: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const orders = await this.search({
      status: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
      orderDateTo: cutoffDate
    })

    // In real implementation, move to archive table
    let archivedCount = 0
    for (const order of orders) {
      // await this.moveToArchive(order.id)
      archivedCount++
    }

    return archivedCount
  }

  // ===== REPORTING QUERIES =====

  /**
   * Get revenue by time period
   */
  async getRevenueByPeriod(
    period: 'day' | 'week' | 'month',
    dateFrom: Date,
    dateTo: Date
  ): Promise<Array<{ period: string; revenue: Money; orderCount: number }>> {
    const orders = await this.search({
      orderDateFrom: dateFrom,
      orderDateTo: dateTo,
      paymentStatus: [PaymentStatus.PAID]
    })

    // Group orders by period
    const grouped = this.groupOrdersByPeriod(orders, period)
    
    return Object.entries(grouped).map(([periodKey, periodOrders]) => ({
      period: periodKey,
      revenue: {
        amount: periodOrders.reduce((sum, order) => sum + order.totalAmount.amount, 0),
        currency: 'CAD'
      },
      orderCount: periodOrders.length
    }))
  }

  /**
   * Get top customers by order value
   */
  async getTopCustomers(limit = 10): Promise<Array<{
    customerId: string
    customerName: string
    totalOrders: number
    totalValue: Money
    averageOrderValue: Money
  }>> {
    const orders = await this.findMany({
      where: { paymentStatus: PaymentStatus.PAID },
      orderBy: { field: 'orderDate', direction: 'DESC' }
    })

    // Group by customer
    const customerOrders = orders.reduce((acc, order) => {
      const key = order.customerId
      if (!acc[key]) {
        acc[key] = {
          customerId: order.customerId,
          customerName: `${order.customerSnapshot.firstName} ${order.customerSnapshot.lastName}`,
          orders: []
        }
      }
      acc[key].orders.push(order)
      return acc
    }, {} as Record<string, any>)

    // Calculate metrics and sort
    return Object.values(customerOrders)
      .map(customer => ({
        customerId: customer.customerId,
        customerName: customer.customerName,
        totalOrders: customer.orders.length,
        totalValue: {
          amount: customer.orders.reduce((sum: number, order: Order) => sum + order.totalAmount.amount, 0),
          currency: 'CAD'
        },
        averageOrderValue: {
          amount: customer.orders.reduce((sum: number, order: Order) => sum + order.totalAmount.amount, 0) / customer.orders.length,
          currency: 'CAD'
        }
      }))
      .sort((a, b) => b.totalValue.amount - a.totalValue.amount)
      .slice(0, limit)
  }

  // ===== UTILITY METHODS =====

  private calculateAverageProcessingTime(completedOrders: Order[]): number {
    if (completedOrders.length === 0) return 0

    const totalMinutes = completedOrders.reduce((sum, order) => {
      if (order.completedAt && order.orderDate) {
        const processingTime = order.completedAt.getTime() - order.orderDate.getTime()
        return sum + (processingTime / (1000 * 60)) // Convert to minutes
      }
      return sum
    }, 0)

    return totalMinutes / completedOrders.length
  }

  private calculateOnTimeDeliveryRate(deliveryOrders: Order[]): number {
    if (deliveryOrders.length === 0) return 100

    const onTimeOrders = deliveryOrders.filter(order => {
      if (!order.deliveryInfo?.actualDeliveryTime || !order.scheduledDeliveryDate) {
        return false
      }
      return order.deliveryInfo.actualDeliveryTime <= order.scheduledDeliveryDate
    })

    return (onTimeOrders.length / deliveryOrders.length) * 100
  }

  private groupOrdersByPeriod(orders: Order[], period: 'day' | 'week' | 'month'): Record<string, Order[]> {
    return orders.reduce((acc, order) => {
      let key: string
      const date = order.orderDate

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0] // YYYY-MM-DD
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(order)
      return acc
    }, {} as Record<string, Order[]>)
  }

  private createQueryBuilder() {
    // Mock query builder - in real implementation, use actual ORM
    return {
      conditions: [] as any[],
      _orderBy: null as any,
      
      where(field: string, operator?: any, value?: any) {
        if (arguments.length === 2) {
          // where(field, value)
          this.conditions.push({ field, operator: '=', value: operator })
        } else {
          // where(field, operator, value)
          this.conditions.push({ field, operator, value })
        }
        return this
      },
      
      whereIn(field: string, values: any[]) {
        this.conditions.push({ field, operator: 'IN', value: values })
        return this
      },
      
      whereJsonContains(field: string, value: any) {
        this.conditions.push({ field, operator: 'JSON_CONTAINS', value })
        return this
      },
      
      orderBy(field: string, direction: 'ASC' | 'DESC') {
        this._orderBy = { field, direction }
        return this
      },
      
      async execute(): Promise<Order[]> {
        // Mock implementation - in reality, this would execute the SQL query
        // For now, return empty array
        return []
      }
    }
  }
}