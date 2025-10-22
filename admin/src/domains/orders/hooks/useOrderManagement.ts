/**
 * React Hook for Single Order Management
 * Manages loading and updating a single order
 */

import { useState, useEffect, useCallback } from 'react'
import { Order, OrderStatus } from '../entities/Order'
import { useOrderService } from './useOrderService'

export const useOrderManagement = (orderId?: string) => {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getOrder, updateOrder } = useOrderService()

  // Fetch order by ID
  const fetchOrder = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const orderData = await getOrder(id)
      setOrder(orderData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load order'
      setError(message)
      console.error('Error fetching order:', err)
    } finally {
      setLoading(false)
    }
  }, [getOrder])

  // Update order status
  const updateOrderStatus = useCallback(async (status: OrderStatus, notes?: string) => {
    if (!order) return null

    setSaving(true)
    setError(null)
    try {
      const updatedOrder = await updateOrder(order.id, { status, ...(notes && { notes }) })
      setOrder(updatedOrder)
      return updatedOrder
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update order status'
      setError(message)
      console.error('Error updating order status:', err)
      return null
    } finally {
      setSaving(false)
    }
  }, [order, updateOrder])

  // Update order field
  const updateOrderField = useCallback(async (field: string, value: any) => {
    if (!order) return null

    setSaving(true)
    setError(null)
    try {
      const updates = { [field]: value }
      const updatedOrder = await updateOrder(order.id, updates)
      setOrder(updatedOrder)
      return updatedOrder
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update order'
      setError(message)
      console.error('Error updating order:', err)
      return null
    } finally {
      setSaving(false)
    }
  }, [order, updateOrder])

  // Auto-load order when ID changes
  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId)
    } else {
      setOrder(null)
      setError(null)
    }
  }, [orderId, fetchOrder])

  return {
    order,
    loading,
    saving,
    error,
    fetchOrder,
    updateOrderStatus,
    updateOrderField
  }
}
