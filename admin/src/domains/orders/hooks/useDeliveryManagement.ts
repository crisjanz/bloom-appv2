/**
 * React Hook for Delivery Management
 * Handles delivery scheduling, driver assignment, and delivery proof
 */

import { useState, useCallback } from 'react'
import { Order, OrderStatus, OrderSearchCriteria } from '../entities/Order'
import { useOrderService } from './useOrderService'

export const useDeliveryManagement = () => {
  const { orderService } = useOrderService()
  const [deliveryData, setDeliveryData] = useState<{ forDelivery: Order[], forPickup: Order[], completed: Order[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch delivery orders by date
  const fetchDeliveryData = useCallback(async (date: string) => {
    setLoading(true)
    setError(null)
    try {
      // Search for orders scheduled for the given date (search by date range for the full day)
      const searchDate = new Date(date)
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)

      const criteria: OrderSearchCriteria = {
        deliveryDateFrom: searchDate,
        deliveryDateTo: nextDay
      }

      const orders = await orderService.search(criteria)

      console.log('🔍 Delivery page - fetched orders:', orders.length)
      orders.forEach(order => {
        console.log(`  Order ${order.orderNumber}: type=${order.orderType}, fulfillmentType=${order.fulfillmentType}, status=${order.status}`)
      })

      // Separate into delivery, pickup, and completed orders
      const forDelivery = orders.filter(order =>
        order.fulfillmentType === 'DELIVERY' &&
        (order.status === OrderStatus.READY_FOR_DELIVERY || order.status === OrderStatus.OUT_FOR_DELIVERY)
      )

      const forPickup = orders.filter(order =>
        order.fulfillmentType === 'PICKUP' &&
        order.status === OrderStatus.READY_FOR_PICKUP
      )

      const completed = orders.filter(order =>
        order.status === OrderStatus.COMPLETED ||
        order.status === OrderStatus.DELIVERED ||
        order.status === OrderStatus.PICKED_UP
      )

      console.log(`📋 Filtered results: forDelivery=${forDelivery.length}, forPickup=${forPickup.length}, completed=${completed.length}`)

      setDeliveryData({ forDelivery, forPickup, completed })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch delivery data'
      setError(message)
      console.error('Delivery data fetch error:', err)
      setDeliveryData({ forDelivery: [], forPickup: [], completed: [] }) // Set empty arrays to prevent errors
    } finally {
      setLoading(false)
    }
  }, [orderService])

  const scheduleDelivery = useCallback(async (
    orderId: string,
    scheduledDate: Date,
    timeSlot?: any
  ): Promise<Order | null> => {
    try {
      return await orderService.scheduleDelivery(orderId, scheduledDate, timeSlot)
    } catch (err) {
      console.error('Delivery scheduling error:', err)
      return null
    }
  }, [orderService])

  const markOutForDelivery = useCallback(async (orderId: string, driverAssigned: string): Promise<Order | null> => {
    try {
      return await orderService.markOutForDelivery(orderId, driverAssigned)
    } catch (err) {
      console.error('Out for delivery error:', err)
      return null
    }
  }, [orderService])

  const markDelivered = useCallback(async (
    orderId: string,
    deliveryProof?: {
      photo?: string
      signature?: string
      deliveredTo?: string
      notes?: string
    }
  ): Promise<Order | null> => {
    try {
      return await orderService.markDelivered(orderId, deliveryProof)
    } catch (err) {
      console.error('Mark delivered error:', err)
      return null
    }
  }, [orderService])

  const recordFailedDelivery = useCallback(async (
    orderId: string,
    reason: string,
    notes?: string
  ): Promise<Order | null> => {
    try {
      return await orderService.recordFailedDelivery(orderId, reason, notes)
    } catch (err) {
      console.error('Failed delivery error:', err)
      return null
    }
  }, [orderService])

  // Update order status (for delivery page status changes)
  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus): Promise<Order | null> => {
    try {
      return await orderService.update(orderId, { status })
    } catch (err) {
      console.error('Update order status error:', err)
      return null
    }
  }, [orderService])

  return {
    deliveryData,
    loading,
    error,
    fetchDeliveryData,
    scheduleDelivery,
    markOutForDelivery,
    markDelivered,
    recordFailedDelivery,
    updateOrderStatus
  }
}
