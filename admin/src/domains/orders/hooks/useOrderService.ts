/**
 * React Hooks for Order Service
 * Provides easy access to order operations from React components
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { OrderService } from '../services/OrderService'
import { OrderRepository } from '../repositories/OrderRepository'
import { Order, OrderStatus, OrderType, FulfillmentType, CreateOrderData, UpdateOrderData, OrderSearchCriteria, OrderStats } from '../entities/Order'

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

// ===== POS-SPECIFIC HOOKS =====

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

// ===== ORDER SEARCH HOOK =====

export const useOrderSearch = (initialCriteria: OrderSearchCriteria = {}) => {
  const [criteria, setCriteria] = useState<OrderSearchCriteria>(initialCriteria)
  const [results, setResults] = useState<Order[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { searchOrders } = useOrderService()

  // Debounced search effect
  useEffect(() => {
    if (!criteria.query && Object.keys(criteria).length === 0) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      const orders = await searchOrders(criteria)
      setResults(orders)
      setIsSearching(false)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [criteria, searchOrders])

  const updateCriteria = useCallback((updates: Partial<OrderSearchCriteria>) => {
    setCriteria(prev => ({ ...prev, ...updates }))
  }, [])

  const clearSearch = useCallback(() => {
    setCriteria({})
    setResults([])
  }, [])

  return {
    criteria,
    setCriteria,
    updateCriteria,
    results,
    isSearching,
    clearSearch
  }
}

// ===== ORDER STATUS MANAGEMENT HOOK =====

export const useOrderStatusManagement = () => {
  const { updateOrder } = useOrderService()
  
  // Update order status with validation
  const updateStatus = useCallback(async (orderId: string, newStatus: OrderStatus, notes?: string): Promise<Order | null> => {
    const updates: UpdateOrderData = { status: newStatus }
    
    if (notes) {
      updates.internalNotes = `[${new Date().toISOString()}] Status changed to ${newStatus}: ${notes}`
    }
    
    return await updateOrder(orderId, updates)
  }, [updateOrder])

  // Production workflow methods
  const startProduction = useCallback(async (orderId: string, notes?: string): Promise<Order | null> => {
    return await updateStatus(orderId, OrderStatus.IN_PRODUCTION, notes)
  }, [updateStatus])

  const moveToQualityCheck = useCallback(async (orderId: string): Promise<Order | null> => {
    return await updateStatus(orderId, OrderStatus.QUALITY_CHECK)
  }, [updateStatus])

  const markReadyForPickup = useCallback(async (orderId: string): Promise<Order | null> => {
    return await updateStatus(orderId, OrderStatus.READY_FOR_PICKUP)
  }, [updateStatus])

  const markReadyForDelivery = useCallback(async (orderId: string): Promise<Order | null> => {
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

// ===== DELIVERY MANAGEMENT HOOK =====

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

// ===== ORDER LISTS HOOK =====

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
        searchCriteria.status = criteria.status as OrderStatus
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

// ===== SINGLE ORDER MANAGEMENT HOOK =====

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

// ===== CUSTOMER ORDER HISTORY HOOK =====

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

// ===== ORDER ANALYTICS HOOK =====

export const useOrderAnalytics = () => {
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(false)
  const { orderService } = useOrderService()

  const loadStats = useCallback(async (dateFrom?: Date, dateTo?: Date) => {
    setLoading(true)
    try {
      const orderStats = await orderService.getOrderStats(dateFrom, dateTo)
      setStats(orderStats)
    } catch (err) {
      console.error('Error loading order statistics:', err)
    } finally {
      setLoading(false)
    }
  }, [orderService])

  // Load stats on mount (default to last 30 days)
  useEffect(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    loadStats(thirtyDaysAgo, new Date())
  }, [loadStats])

  return {
    stats,
    loading,
    loadStats
  }
}

// ===== ORDER IMAGE UPLOAD HOOK =====

interface UploadResult {
  success: boolean;
  imageUrls: string[];
  error?: string;
}

export const useOrderImages = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImages = useCallback(async (files: File[]): Promise<UploadResult> => {
    try {
      setUploading(true);
      setError(null);

      if (!files || files.length === 0) {
        return {
          success: true,
          imageUrls: []
        };
      }

      // Create FormData to send files
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      console.log(`🖼️ Uploading ${files.length} order images...`);

      // Start upload
      const uploadResponse = await fetch('/api/orders/upload-images', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadResult = await uploadResponse.json();
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      const { uploadId } = uploadResult;
      console.log(`📤 Upload started with ID: ${uploadId}`);

      // Poll for completion since upload happens in background
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const statusResponse = await fetch(`/api/orders/upload-status/${uploadId}`);
        
        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.statusText}`);
        }

        const status = await statusResponse.json();
        
        if (!status.success) {
          throw new Error(status.error || 'Status check failed');
        }

        if (status.status === 'completed') {
          console.log(`✅ Upload completed with ${status.imageUrls?.length || 0} images`);
          return {
            success: true,
            imageUrls: status.imageUrls || []
          };
        }
        
        if (status.status === 'failed') {
          throw new Error(status.error || 'Upload failed');
        }
        
        // Still uploading, continue polling
        attempts++;
        console.log(`⏳ Upload in progress... (${attempts}/${maxAttempts})`);
      }

      throw new Error('Upload timeout - took longer than 30 seconds');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      console.error('❌ Image upload error:', errorMessage);
      setError(errorMessage);
      
      return {
        success: false,
        imageUrls: [],
        error: errorMessage
      };
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    uploading,
    error,
    uploadImages
  };
};

// ===== ORDER PAYMENTS HOOK =====

export const useOrderPayments = () => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePOSTransfer = useCallback(async (customerState: any, orderState: any, totals: any, employee: string, cleanPhoneNumber: (value: string) => string) => {
    setProcessing(true);
    setError(null);

    try {
      console.log('📤 POS transfer initiated');

      // Ensure we have a customer ID - create one if needed
      let currentCustomerId = customerState.customer?.id || customerState.customerId;

      if (!currentCustomerId && customerState.customer) {
        console.log('👤 Creating new customer...');
        try {
          const customerResponse = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: customerState.customer.firstName || '',
              lastName: customerState.customer.lastName || '',
              email: customerState.customer.email || '',
              phone: customerState.customer.phone || ''
            })
          });

          if (customerResponse.ok) {
            const newCustomer = await customerResponse.json();
            currentCustomerId = newCustomer.id;
            console.log('✅ Customer created:', currentCustomerId);

            // Update the customer state with the new ID
            customerState.setCustomerId?.(currentCustomerId);
          } else {
            throw new Error('Failed to create customer');
          }
        } catch (error) {
          console.error('❌ Customer creation failed:', error);
          throw new Error('Failed to create customer');
        }
      }

      if (!currentCustomerId) {
        throw new Error('Customer information is required');
      }

      // NEW: Create/update recipients for delivery orders
      const ordersWithRecipientIds = await Promise.all(
        orderState.orders.map(async (order: any) => {
          if (order.orderType === 'DELIVERY') {
            // If order has recipientCustomerId (from phone-first lookup or "Use Customer's Name"), use that
            if (order.recipientCustomerId && order.selectedAddressId) {
              console.log('✓ POS Transfer using existing customer-based recipient:', order.recipientCustomerId);
              return {
                ...order,
                recipientCustomerId: order.recipientCustomerId,
                deliveryAddressId: order.selectedAddressId,
                recipientId: undefined // Don't use old format
              };
            }

            // NEW FLOW: Always create Customer for new recipients
            console.log('✓ POS Transfer creating new customer-based recipient');

            // Create new customer as recipient
            const createCustomerResponse = await fetch('/api/customers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                firstName: order.recipientFirstName.trim(),
                lastName: order.recipientLastName.trim(),
                phone: cleanPhoneNumber(order.recipientPhone),
                email: '', // Recipients don't need email initially
              }),
            });

            if (!createCustomerResponse.ok) {
              throw new Error('Failed to create recipient customer');
            }

            const newCustomer = await createCustomerResponse.json();

            // Create address for this customer
            const createAddressResponse = await fetch(`/api/customers/${newCustomer.id}/addresses`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                label: order.recipientAddressLabel?.trim() || 'Home',
                firstName: order.recipientFirstName.trim(),
                lastName: order.recipientLastName.trim(),
                phone: cleanPhoneNumber(order.recipientPhone),
                address1: order.recipientAddress.address1.trim(),
                address2: order.recipientAddress.address2?.trim() || '',
                city: order.recipientAddress.city.trim(),
                province: order.recipientAddress.province,
                postalCode: order.recipientAddress.postalCode.trim(),
                country: order.recipientAddress.country || 'CA',
                company: order.recipientCompany?.trim() || '',
                addressType: order.recipientAddressType || 'RESIDENCE',
              }),
            });

            if (!createAddressResponse.ok) {
              throw new Error('Failed to create recipient address');
            }

            const newAddress = await createAddressResponse.json();

            // Link as recipient
            await fetch(`/api/customers/${currentCustomerId}/save-recipient`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipientCustomerId: newCustomer.id
              }),
            });

            return {
              ...order,
              recipientCustomerId: newCustomer.id,
              deliveryAddressId: newAddress.id,
              recipientId: undefined // Don't use old format
            };
          }
          return order;
        })
      );

      // Create DRAFT orders for POS transfer
      const draftOrderData = {
        customerId: currentCustomerId,
        orders: ordersWithRecipientIds,
      };

      console.log('📦 Creating draft orders for POS transfer...');
      const response = await fetch('/api/orders/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftOrderData)
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create draft orders');
      }

      console.log('✅ Draft orders created successfully');

      // Return transfer data for POS
      return {
        type: 'pos_transfer',
        customer: customerState.customer,
        orders: result.drafts,
        draftIds: result.drafts.map((d: any) => d.id),
        totals,
        employee,
        orderSource: 'takeorder_to_pos'
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'POS transfer failed';
      console.error('❌ POS transfer failed:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  const completeOrderPayment = useCallback(async (
    customerState: any,
    orderState: any,
    payments: any[],
    totals: any,
    employee: string,
    orderSource: string,
    cleanPhoneNumber: (value: string) => string
  ) => {
    setProcessing(true);
    setError(null);

    try {
      console.log('💰 Order payment completion initiated');

      // Ensure we have a customer ID - create one if needed
      let currentCustomerId = customerState.customer?.id || customerState.customerId;

      console.log('🔍 Customer ID check:', {
        customerObjectId: customerState.customer?.id,
        customerStateId: customerState.customerId,
        finalId: currentCustomerId,
        hasCustomerObject: !!customerState.customer
      });

      if (!currentCustomerId && customerState.customer) {
        console.log('👤 Creating new customer for payment...');
        try {
          const customerResponse = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: customerState.customer.firstName || '',
              lastName: customerState.customer.lastName || '',
              email: customerState.customer.email || '',
              phone: customerState.customer.phone || ''
            })
          });

          if (customerResponse.ok) {
            const newCustomer = await customerResponse.json();
            currentCustomerId = newCustomer.id;
            console.log('✅ Customer created for payment:', currentCustomerId);

            // Update the customer state with the new ID
            customerState.setCustomerId?.(currentCustomerId);
          } else {
            throw new Error('Failed to create customer');
          }
        } catch (error) {
          console.error('❌ Customer creation failed:', error);
          setError('Failed to create customer. Please try again.');
          return {
            success: false,
            error: 'Failed to create customer'
          };
        }
      }

      if (!currentCustomerId) {
        setError('Customer information is required');
        return {
          success: false,
          error: 'Customer information is required'
        };
      }

      // NEW: Create/update recipients for delivery orders
      const ordersWithRecipientIds = await Promise.all(
        orderState.orders.map(async (order: any) => {
          if (order.orderType === 'DELIVERY') {
            try {
              // If order has recipientCustomerId (from phone-first lookup or "Use Customer's Name"), use that
              if (order.recipientCustomerId && order.selectedAddressId) {
                console.log('✓ Using existing customer-based recipient:', order.recipientCustomerId);
                return {
                  ...order,
                  recipientCustomerId: order.recipientCustomerId,
                  deliveryAddressId: order.selectedAddressId,
                  recipientId: undefined // Don't use old format
                };
              }

              // NEW FLOW: Always create Customer for new recipients
              console.log('✓ Creating new customer-based recipient');

              // Create new customer as recipient
              const createCustomerResponse = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  firstName: order.recipientFirstName.trim(),
                  lastName: order.recipientLastName.trim(),
                  phone: cleanPhoneNumber(order.recipientPhone),
                  email: '', // Recipients don't need email initially
                }),
              });

              if (!createCustomerResponse.ok) {
                throw new Error('Failed to create recipient customer');
              }

              const newCustomer = await createCustomerResponse.json();

              // Create address for this customer
              const createAddressResponse = await fetch(`/api/customers/${newCustomer.id}/addresses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  label: order.recipientAddressLabel?.trim() || 'Home',
                  firstName: order.recipientFirstName.trim(),
                  lastName: order.recipientLastName.trim(),
                  phone: cleanPhoneNumber(order.recipientPhone),
                  address1: order.recipientAddress.address1.trim(),
                  address2: order.recipientAddress.address2?.trim() || '',
                  city: order.recipientAddress.city.trim(),
                  province: order.recipientAddress.province,
                  postalCode: order.recipientAddress.postalCode.trim(),
                  country: order.recipientAddress.country || 'CA',
                  company: order.recipientCompany?.trim() || '',
                  addressType: order.recipientAddressType || 'RESIDENCE',
                }),
              });

              if (!createAddressResponse.ok) {
                throw new Error('Failed to create recipient address');
              }

              const newAddress = await createAddressResponse.json();

              // Link as recipient
              await fetch(`/api/customers/${currentCustomerId}/save-recipient`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  recipientCustomerId: newCustomer.id
                }),
              });

              return {
                ...order,
                recipientCustomerId: newCustomer.id,
                deliveryAddressId: newAddress.id,
                recipientId: undefined // Don't use old format
              };
            } catch (error) {
              console.error('❌ Recipient creation failed:', error);
              throw error;
            }
          }
          return order;
        })
      );

      // Create orders via API
      const orderData = {
        customerId: currentCustomerId,
        orders: ordersWithRecipientIds,
        paymentConfirmed: true,
        employee,
        orderSource: orderSource.toUpperCase(),
      };

      console.log('📦 Creating orders via API...', { orderCount: ordersWithRecipientIds.length });
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create orders');
      }

      const result = await response.json();

      if (!result.success || !result.orders) {
        throw new Error(result.error || 'Failed to create orders');
      }

      console.log('✅ Orders created successfully:', result.orders.map((o: any) => o.id));

      return {
        success: true,
        orders: result.orders
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Order payment completion failed';
      console.error('❌ Order creation failed:', errorMessage);
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    processing,
    error,
    handlePOSTransfer,
    completeOrderPayment
  };
};