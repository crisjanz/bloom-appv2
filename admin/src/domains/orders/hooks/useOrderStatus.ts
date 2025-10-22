/**
 * React Hook for Order Status Management
 * Handles order status transitions and workflow methods
 */

import { useCallback } from 'react'
import { OrderStatus, UpdateOrderData } from '../entities/Order'
import { useOrderService } from './useOrderService'

export const useOrderStatusManagement = () => {
  const { updateOrder } = useOrderService()

  // Update order status with validation
  const updateStatus = useCallback(async (orderId: string, newStatus: OrderStatus, notes?: string) => {
    const updates: UpdateOrderData = { status: newStatus }

    if (notes) {
      updates.internalNotes = `[${new Date().toISOString()}] Status changed to ${newStatus}: ${notes}`
    }

    return await updateOrder(orderId, updates)
  }, [updateOrder])

  // Production workflow methods
  const startProduction = useCallback(async (orderId: string, notes?: string) => {
    return await updateStatus(orderId, OrderStatus.IN_PRODUCTION, notes)
  }, [updateStatus])

  const moveToQualityCheck = useCallback(async (orderId: string) => {
    return await updateStatus(orderId, OrderStatus.QUALITY_CHECK)
  }, [updateStatus])

  const markReadyForPickup = useCallback(async (orderId: string) => {
    return await updateStatus(orderId, OrderStatus.READY_FOR_PICKUP)
  }, [updateStatus])

  const markReadyForDelivery = useCallback(async (orderId: string) => {
    return await updateStatus(orderId, OrderStatus.READY_FOR_DELIVERY)
  }, [updateStatus])

  return {
    updateStatus,
    startProduction,
    moveToQualityCheck,
    markReadyForPickup,
    markReadyForDelivery
  }
}
