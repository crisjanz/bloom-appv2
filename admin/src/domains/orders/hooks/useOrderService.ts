/**
 * React Hooks for Order Service
 * Provides easy access to order operations from React components
 *
 * NOTE: This file now contains only the core CRUD operations.
 * Specialized hooks have been extracted to separate files:
 * - useOrderImages.ts - Image upload operations
 * - useOrderAnalytics.ts - Order statistics
 * - useOrderSearch.ts - Search with debouncing
 * - useOrderStatus.ts - Status management
 * - useOrderLists.ts - List fetching
 * - useDeliveryManagement.ts - Delivery operations
 * - useCustomerOrders.ts - Customer order history
 * - useOrderPayments.ts - Payment flows
 * - usePOSOrders.ts - POS-specific operations
 * - useOrderManagement.ts - Single order management
 */

import { useState, useCallback } from 'react'
import { OrderService } from '../services/OrderService'
import { OrderRepository } from '../repositories/OrderRepository'
import { Order, CreateOrderData, UpdateOrderData, OrderSearchCriteria } from '../entities/Order'

// Create singleton instances (in production, use dependency injection)
const orderRepository = new OrderRepository()
const orderService = new OrderService(orderRepository)

// ===== MAIN ORDER SERVICE HOOK =====

export const useOrderService = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear error when operation starts
  const clearError = useCallback(() => setError(null), [])

  // Generic error handler
  const handleError = useCallback((err: any) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    setError(message)
    console.error('Order service error:', err)
  }, [])

  // Create new order
  const createOrder = useCallback(async (orderData: CreateOrderData): Promise<Order | null> => {
    setLoading(true)
    clearError()

    try {
      const order = await orderService.create(orderData)
      return order
    } catch (err) {
      handleError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [clearError, handleError])

  // Get order by ID
  const getOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    setLoading(true)
    clearError()

    try {
      const order = await orderService.findById(orderId)
      return order
    } catch (err) {
      handleError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [clearError, handleError])

  // Update order
  const updateOrder = useCallback(async (orderId: string, updates: UpdateOrderData): Promise<Order | null> => {
    setLoading(true)
    clearError()

    try {
      const order = await orderService.update(orderId, updates)
      return order
    } catch (err) {
      handleError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [clearError, handleError])

  // Search orders
  const searchOrders = useCallback(async (criteria: OrderSearchCriteria): Promise<Order[]> => {
    setLoading(true)
    clearError()

    try {
      const orders = await orderService.search(criteria)
      return orders
    } catch (err) {
      handleError(err)
      return []
    } finally {
      setLoading(false)
    }
  }, [clearError, handleError])

  // Find order by order number
  const findByOrderNumber = useCallback(async (orderNumber: string): Promise<Order | null> => {
    if (!orderNumber) return null

    setLoading(true)
    clearError()

    try {
      const order = await orderService.findByOrderNumber(orderNumber)
      return order
    } catch (err) {
      handleError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [clearError, handleError])

  return {
    // State
    loading,
    error,
    clearError,

    // Order operations
    createOrder,
    getOrder,
    updateOrder,
    searchOrders,
    findByOrderNumber,

    // Direct service access for advanced operations
    orderService
  }
}
