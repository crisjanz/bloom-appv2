/**
 * React Hook for POS-Specific Order Operations
 * Handles POS order creation, payment processing, and confirmation
 */

import { useCallback } from 'react'
import { Order, FulfillmentType } from '../entities/Order'
import { useOrderService } from './useOrderService'

export const usePOSOrderService = () => {
  const { orderService, loading, error, clearError } = useOrderService()

  // Create POS order from cart
  const createPOSOrder = useCallback(async (cartData: {
    customerId: string
    items: any[]
    fulfillmentType: FulfillmentType
    deliveryInfo?: any
    pickupInfo?: any
    paymentTransactionId?: string
    specialInstructions?: string
  }): Promise<Order | null> => {
    try {
      const order = await orderService.createPOSOrder(cartData)
      return order
    } catch (err) {
      console.error('POS order creation error:', err)
      return null
    }
  }, [orderService])

  // Process payment for order
  const processPayment = useCallback(async (orderId: string, paymentTransactionId: string): Promise<Order | null> => {
    try {
      const order = await orderService.processPayment(orderId, paymentTransactionId)
      return order
    } catch (err) {
      console.error('Payment processing error:', err)
      return null
    }
  }, [orderService])

  // Confirm order (staff reviewed)
  const confirmOrder = useCallback(async (orderId: string, employeeId: string, notes?: string): Promise<Order | null> => {
    try {
      const order = await orderService.confirmOrder(orderId, employeeId, notes)
      return order
    } catch (err) {
      console.error('Order confirmation error:', err)
      return null
    }
  }, [orderService])

  return {
    loading,
    error,
    clearError,
    createPOSOrder,
    processPayment,
    confirmOrder
  }
}
