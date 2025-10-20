/**
 * React Hook for Calendar Orders
 * Fetches and groups orders by date, type (PICKUP/DELIVERY), and completion status
 */

import { useState, useEffect, useCallback } from 'react'
import { ApiService } from '@shared/infrastructure/api/ApiService'
import { OrderStatus } from '../entities/Order'

interface OrderCalendarData {
  date: string // YYYY-MM-DD format
  pickup: {
    pending: number
    completed: number
    orders: any[]
  }
  delivery: {
    pending: number
    completed: number
    orders: any[]
  }
}

interface CalendarOrdersResult {
  ordersByDate: Map<string, OrderCalendarData>
  loading: boolean
  error: string | null
  fetchOrdersForMonth: (year: number, month: number) => Promise<void>
}

/**
 * Determine if an order status represents a completed order
 */
const isCompletedStatus = (status: string): boolean => {
  return [
    'COMPLETED',
    'DELIVERED',
    'PICKED_UP'
  ].includes(status)
}

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const useCalendarOrders = (): CalendarOrdersResult => {
  const [ordersByDate, setOrdersByDate] = useState<Map<string, OrderCalendarData>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch orders for a specific month and group them
   */
  const fetchOrdersForMonth = useCallback(async (year: number, month: number) => {
    setLoading(true)
    setError(null)

    try {
      // Calculate month start and end dates
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0) // Last day of month

      const deliveryDateFrom = formatDate(monthStart)
      const deliveryDateTo = formatDate(monthEnd)

      // Fetch orders from backend
      const result = await ApiService.get<{ success: boolean; orders: any[] }>(
        `/api/orders/list?deliveryDateFrom=${deliveryDateFrom}&deliveryDateTo=${deliveryDateTo}&limit=1000`
      )

      if (!result.success || !result.data) {
        throw new Error('Failed to fetch orders')
      }

      const orders = result.data.orders || []

      // Group orders by date and type
      const grouped = new Map<string, OrderCalendarData>()

      orders.forEach((order: any) => {
        if (!order.deliveryDate) return

        // Format delivery date
        const deliveryDate = formatDate(new Date(order.deliveryDate))

        // Initialize date entry if not exists
        if (!grouped.has(deliveryDate)) {
          grouped.set(deliveryDate, {
            date: deliveryDate,
            pickup: { pending: 0, completed: 0, orders: [] },
            delivery: { pending: 0, completed: 0, orders: [] }
          })
        }

        const dateData = grouped.get(deliveryDate)!
        const isCompleted = isCompletedStatus(order.status)
        const orderType = order.type // 'PICKUP' or 'DELIVERY'

        // Group by order type (PICKUP or DELIVERY)
        if (orderType === 'PICKUP') {
          if (isCompleted) {
            dateData.pickup.completed++
          } else {
            dateData.pickup.pending++
          }
          dateData.pickup.orders.push(order)
        } else if (orderType === 'DELIVERY') {
          if (isCompleted) {
            dateData.delivery.completed++
          } else {
            dateData.delivery.pending++
          }
          dateData.delivery.orders.push(order)
        }
      })

      setOrdersByDate(grouped)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch calendar orders'
      setError(message)
      console.error('Error fetching calendar orders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    ordersByDate,
    loading,
    error,
    fetchOrdersForMonth
  }
}
