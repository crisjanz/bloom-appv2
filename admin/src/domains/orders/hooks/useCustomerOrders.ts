/**
 * React Hook for Customer Order History
 * Fetches and manages customer order history and metrics
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Order } from '../entities/Order'

export const useCustomerOrderHistory = (customerId?: string) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  const loadOrderHistory = useCallback(async (customerIdToLoad: string) => {
    setLoading(true)
    try {
      // Fetch orders where customer is EITHER buyer OR recipient
      const response = await fetch(`/api/customers/${customerIdToLoad}/orders`)
      if (!response.ok) {
        throw new Error('Failed to fetch customer orders')
      }
      const result = await response.json()
      setOrders(result.orders || [])
    } catch (err) {
      console.error('Error loading customer order history:', err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-load when customerId changes
  useEffect(() => {
    if (customerId) {
      loadOrderHistory(customerId)
    } else {
      setOrders([])
    }
  }, [customerId, loadOrderHistory])

  // Calculate customer metrics
  const customerMetrics = useMemo(() => {
    if (orders.length === 0) {
      return {
        totalOrders: 0,
        totalSpent: { amount: 0, currency: 'CAD' },
        averageOrderValue: { amount: 0, currency: 'CAD' },
        lastOrderDate: null,
        favoriteOrderType: null
      }
    }

    // Backend returns paymentAmount as cents (number), not totalAmount.amount
    const totalSpent = orders.reduce((sum, order: any) => {
      const amount = order.paymentAmount || 0
      return sum + amount
    }, 0)
    const averageOrderValue = totalSpent / orders.length
    const lastOrderDate = orders[0]?.createdAt // Backend uses createdAt, not orderDate

    // Find most common order type
    const typeCount = orders.reduce((acc, order: any) => {
      const type = order.type || 'DELIVERY' // Backend uses 'type' field
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const favoriteOrderType = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null

    return {
      totalOrders: orders.length,
      totalSpent: { amount: totalSpent, currency: 'CAD' },
      averageOrderValue: { amount: averageOrderValue, currency: 'CAD' },
      lastOrderDate,
      favoriteOrderType
    }
  }, [orders])

  return {
    orders,
    loading,
    loadOrderHistory,
    customerMetrics
  }
}
