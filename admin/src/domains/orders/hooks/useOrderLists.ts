/**
 * React Hook for Order Lists
 * Fetches and manages multiple order lists (active, today's, delivery, pickup)
 */

import { useState, useEffect, useCallback } from 'react'
import { OrderRepository } from '../repositories/OrderRepository'
import { Order, OrderSearchCriteria, OrderStatus, PaymentStatus } from '../entities/Order'
import { useOrderService } from './useOrderService'

// Create singleton instance
const orderRepository = new OrderRepository()

export const useOrderLists = () => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [todaysOrders, setTodaysOrders] = useState<Order[]>([])
  const [deliveryOrders, setDeliveryOrders] = useState<Order[]>([])
  const [pickupOrders, setPickupOrders] = useState<Order[]>([])
  const [orders, setOrders] = useState<Order[]>([]) // Add general orders list
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null) // Add error state
  const { orderService } = useOrderService()

  // Fetch orders with filters (for OrdersListPage)
  const fetchOrders = useCallback(async (criteria: {
    status?: string,
    paymentStatus?: string,
    search?: string,
    limit?: number,
    orderDateFrom?: string,
    orderDateTo?: string,
    deliveryDateFrom?: string,
    deliveryDateTo?: string
  } = {}) => {
    setLoading(true)
    setError(null)
    try {
      // Convert status filter to search criteria
      const searchCriteria: OrderSearchCriteria = {}
      if (criteria.status && criteria.status !== 'ALL') {
        searchCriteria.status = [criteria.status as OrderStatus]
      }
      if (criteria.paymentStatus && criteria.paymentStatus !== 'ALL') {
        searchCriteria.paymentStatus = [criteria.paymentStatus as PaymentStatus]
      }
      if (criteria.search) {
        searchCriteria.query = criteria.search
      }
      if (criteria.orderDateFrom) {
        searchCriteria.orderDateFrom = new Date(criteria.orderDateFrom)
      }
      if (criteria.orderDateTo) {
        searchCriteria.orderDateTo = new Date(criteria.orderDateTo)
      }
      if (criteria.deliveryDateFrom) {
        searchCriteria.deliveryDateFrom = new Date(criteria.deliveryDateFrom)
      }
      if (criteria.deliveryDateTo) {
        searchCriteria.deliveryDateTo = new Date(criteria.deliveryDateTo)
      }
      if (criteria.limit) {
        searchCriteria.limit = criteria.limit
      }

      const results = await orderService.search(searchCriteria)
      setOrders(results)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load orders'
      setError(message)
      console.error('Error fetching orders:', err)
      setOrders([]) // Set empty array to prevent map errors
    } finally {
      setLoading(false)
    }
  }, [orderService])

  // Refresh all order lists
  const refreshLists = useCallback(async () => {
    setLoading(true)
    try {
      const [active, todays, delivery, pickup] = await Promise.all([
        orderService.findActiveOrders(),
        orderService.findTodaysOrders(),
        orderRepository.getTodaysDeliveryOrders(),
        orderRepository.getPickupReadyOrders()
      ])

      setActiveOrders(active)
      setTodaysOrders(todays)
      setDeliveryOrders(delivery)
      setPickupOrders(pickup)
    } catch (err) {
      console.error('Error refreshing order lists:', err)
    } finally {
      setLoading(false)
    }
  }, [orderService])

  // Auto-refresh on mount
  useEffect(() => {
    refreshLists()
  }, [refreshLists])

  return {
    activeOrders,
    todaysOrders,
    deliveryOrders,
    pickupOrders,
    orders, // Add general orders list
    loading,
    error, // Add error state
    refreshLists,
    fetchOrders // Add fetchOrders function
  }
}
