/**
 * Order Notifications Integration
 * Integrates notification domain with order status changes
 */

import { 
  NotificationChannel, 
  NotificationType, 
  RecipientType,
  SendNotificationRequest 
} from '../entities/Notification'
import { NotificationService } from '../services/NotificationService'

// ===== ORDER NOTIFICATION TRIGGERS =====

export interface OrderNotificationData {
  orderId: string
  orderNumber: string
  status: string
  total: number
  deliveryDate?: string
  deliveryTime?: string
  
  // Customer data
  customerId?: string
  customerFirstName?: string
  customerLastName?: string
  customerEmail?: string
  customerPhone?: string
  
  // Recipient data (for delivery orders)
  recipientName?: string
  recipientEmail?: string
  recipientPhone?: string
  deliveryAddress?: string
  
  // Order details
  isPickup?: boolean
  storeName?: string
  storePhone?: string
  
  // Context
  employeeId?: string
  notes?: string
}

export class OrderNotificationIntegration {
  constructor(private notificationService: NotificationService) {}

  /**
   * Send order status change notifications
   */
  async sendOrderStatusNotification(data: OrderNotificationData): Promise<void> {
    console.log(`🔔 Sending order status notifications for order ${data.orderNumber} - Status: ${data.status}`)

    const templateData = {
      // Customer tokens
      customerFirstName: data.customerFirstName || 'Customer',
      customerLastName: data.customerLastName || '',
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      
      // Recipient tokens
      recipientName: data.recipientName || data.customerFirstName || 'Customer',
      recipientFirstName: data.recipientName?.split(' ')[0] || data.customerFirstName || 'Customer',
      recipientEmail: data.recipientEmail,
      recipientPhone: data.recipientPhone,
      deliveryAddress: data.deliveryAddress,
      
      // Order tokens
      orderNumber: data.orderNumber,
      orderTotal: data.total.toFixed(2),
      deliveryDate: data.deliveryDate,
      deliveryTime: data.deliveryTime,
      isPickup: data.isPickup,
      
      // Store tokens
      storeName: data.storeName || 'Bloom Flowers',
      storePhone: data.storePhone || '(604) 217-5706'
    }

    const notifications: Promise<any>[] = []

    // Get notification type based on status
    const notificationType = this.getNotificationTypeForStatus(data.status)

    try {
      // Customer email notification
      if (data.customerEmail) {
        notifications.push(
          this.notificationService.sendNotification({
            type: notificationType,
            channel: NotificationChannel.EMAIL,
            recipientType: RecipientType.CUSTOMER,
            recipientId: data.customerId,
            recipientEmail: data.customerEmail,
            recipientName: `${data.customerFirstName} ${data.customerLastName}`.trim(),
            contextType: 'order',
            contextId: data.orderId,
            templateData,
            businessHoursOnly: false // Order updates can go anytime
          })
        )
      }

      // Customer SMS notification
      if (data.customerPhone) {
        notifications.push(
          this.notificationService.sendNotification({
            type: notificationType,
            channel: NotificationChannel.SMS,
            recipientType: RecipientType.CUSTOMER,
            recipientId: data.customerId,
            recipientPhone: data.customerPhone,
            recipientName: `${data.customerFirstName} ${data.customerLastName}`.trim(),
            contextType: 'order',
            contextId: data.orderId,
            templateData,
            businessHoursOnly: false
          })
        )
      }

      // Recipient email notification (for delivery orders)
      if (!data.isPickup && data.recipientEmail && data.recipientEmail !== data.customerEmail) {
        notifications.push(
          this.notificationService.sendNotification({
            type: notificationType,
            channel: NotificationChannel.EMAIL,
            recipientType: RecipientType.RECIPIENT,
            recipientEmail: data.recipientEmail,
            recipientName: data.recipientName,
            contextType: 'order',
            contextId: data.orderId,
            templateData,
            businessHoursOnly: false
          })
        )
      }

      // Recipient SMS notification (for delivery orders)
      if (!data.isPickup && data.recipientPhone && data.recipientPhone !== data.customerPhone) {
        notifications.push(
          this.notificationService.sendNotification({
            type: notificationType,
            channel: NotificationChannel.SMS,
            recipientType: RecipientType.RECIPIENT,
            recipientPhone: data.recipientPhone,
            recipientName: data.recipientName,
            contextType: 'order',
            contextId: data.orderId,
            templateData,
            businessHoursOnly: false
          })
        )
      }

      // Send all notifications
      const results = await Promise.allSettled(notifications)
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success)
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !(r.value as any).success))

      console.log(`✅ Order notifications sent: ${successful.length} successful, ${failed.length} failed`)
      
      if (failed.length > 0) {
        console.error('Failed notifications:', failed)
      }

    } catch (error) {
      console.error('Error sending order status notifications:', error)
      throw error
    }
  }

  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation(data: OrderNotificationData): Promise<void> {
    await this.sendOrderStatusNotification({
      ...data,
      status: 'PAID' // Order confirmation happens when order is paid
    })
  }

  /**
   * Send order ready notification
   */
  async sendOrderReady(data: OrderNotificationData): Promise<void> {
    await this.sendOrderStatusNotification({
      ...data,
      status: 'READY'
    })
  }

  /**
   * Send order out for delivery notification
   */
  async sendOrderOutForDelivery(data: OrderNotificationData): Promise<void> {
    await this.sendOrderStatusNotification({
      ...data,
      status: 'OUT_FOR_DELIVERY'
    })
  }

  /**
   * Send order completed notification
   */
  async sendOrderCompleted(data: OrderNotificationData): Promise<void> {
    await this.sendOrderStatusNotification({
      ...data,
      status: 'COMPLETED'
    })
  }

  /**
   * Send order cancelled notification
   */
  async sendOrderCancelled(data: OrderNotificationData): Promise<void> {
    await this.sendOrderStatusNotification({
      ...data,
      status: 'CANCELLED'
    })
  }

  /**
   * Map order status to notification type
   */
  private getNotificationTypeForStatus(status: string): NotificationType {
    const statusMap: Record<string, NotificationType> = {
      'PAID': NotificationType.ORDER_CONFIRMATION,
      'CONFIRMED': NotificationType.ORDER_CONFIRMATION,
      'IN_DESIGN': NotificationType.ORDER_STATUS_UPDATE,
      'READY': NotificationType.ORDER_STATUS_UPDATE,
      'OUT_FOR_DELIVERY': NotificationType.ORDER_STATUS_UPDATE,
      'COMPLETED': NotificationType.ORDER_COMPLETED,
      'DELIVERED': NotificationType.ORDER_COMPLETED,
      'PICKED_UP': NotificationType.ORDER_COMPLETED,
      'CANCELLED': NotificationType.ORDER_CANCELLED
    }

    return statusMap[status.toUpperCase()] || NotificationType.ORDER_STATUS_UPDATE
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Quick function to send order notifications
 * Can be called from anywhere in the app
 */
export async function sendOrderNotification(
  notificationService: NotificationService,
  orderData: OrderNotificationData
): Promise<void> {
  const integration = new OrderNotificationIntegration(notificationService)
  await integration.sendOrderStatusNotification(orderData)
}

/**
 * React hook for order notifications
 */
export function useOrderNotifications() {
  // This would be implemented to use the NotificationService
  // For now, return a placeholder
  return {
    sendOrderStatusNotification: async (data: OrderNotificationData) => {
      console.log('Order notification hook called:', data)
      // TODO: Implement with actual NotificationService instance
    },
    sendOrderConfirmation: async (data: OrderNotificationData) => {
      console.log('Order confirmation hook called:', data)
    },
    sendOrderReady: async (data: OrderNotificationData) => {
      console.log('Order ready hook called:', data)
    },
    sendOrderCompleted: async (data: OrderNotificationData) => {
      console.log('Order completed hook called:', data)
    }
  }
}

// ===== INTEGRATION EXAMPLES =====

/*
// Example: Order status change in order management
import { sendOrderNotification } from './integration/OrderNotifications'
import { NotificationService } from './services/NotificationService'

const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
  const order = await getOrderById(orderId)
  const customer = await getCustomerById(order.customerId)
  
  await sendOrderNotification(notificationService, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: newStatus,
    total: order.total,
    deliveryDate: order.deliveryDate,
    customerId: customer.id,
    customerFirstName: customer.firstName,
    customerLastName: customer.lastName,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    recipientName: order.recipientName,
    recipientEmail: order.recipientEmail,
    recipientPhone: order.recipientPhone,
    deliveryAddress: order.deliveryAddress,
    isPickup: order.fulfillmentType === 'PICKUP'
  })
}

// Example: Order confirmation after payment
import { useOrderNotifications } from './integration/OrderNotifications'

const PaymentSuccess = () => {
  const { sendOrderConfirmation } = useOrderNotifications()
  
  const handlePaymentComplete = async (order) => {
    await sendOrderConfirmation({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: 'PAID',
      total: order.total,
      // ... other order data
    })
  }
}
*/
