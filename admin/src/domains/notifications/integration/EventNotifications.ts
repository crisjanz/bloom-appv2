/**
 * Event Notifications Integration
 * Integrates notification domain with event status changes
 */

import { 
  NotificationChannel, 
  NotificationType, 
  RecipientType,
  SendNotificationRequest 
} from '../entities/Notification'
import { NotificationService } from '../services/NotificationService'

// ===== EVENT NOTIFICATION TRIGGERS =====

export interface EventNotificationData {
  eventId: string
  eventNumber: number
  eventName: string
  eventType: string
  status: string
  eventDate: string
  setupDate?: string
  setupTime?: string
  venue: string
  venueAddress?: string
  quotedAmount?: number
  finalAmount?: number
  
  // Customer data
  customerId?: string
  customerFirstName?: string
  customerLastName?: string
  customerEmail?: string
  customerPhone?: string
  
  // Event contact data
  contactPerson?: string
  contactPhone?: string
  
  // Context
  employeeId?: string
  assignedStaffName?: string
  notes?: string
}

export class EventNotificationIntegration {
  constructor(private notificationService: NotificationService) {}

  /**
   * Send event status change notifications
   */
  async sendEventStatusNotification(data: EventNotificationData): Promise<void> {
    console.log(`🎉 Sending event status notifications for event ${data.eventNumber} - Status: ${data.status}`)

    const templateData = {
      // Customer tokens
      customerFirstName: data.customerFirstName || 'Customer',
      customerLastName: data.customerLastName || '',
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      
      // Event tokens
      eventNumber: data.eventNumber.toString(),
      eventName: data.eventName,
      eventType: data.eventType,
      eventStatus: data.status,
      eventDate: data.eventDate,
      setupDate: data.setupDate,
      setupTime: data.setupTime,
      venue: data.venue,
      venueAddress: data.venueAddress,
      quotedAmount: data.quotedAmount?.toFixed(2),
      finalAmount: data.finalAmount?.toFixed(2),
      
      // Contact tokens
      contactPerson: data.contactPerson,
      contactPhone: data.contactPhone,
      
      // Staff tokens
      assignedStaffName: data.assignedStaffName || 'Bloom Team',
      
      // Store tokens
      storeName: 'Bloom Flowers',
      storePhone: '(604) 217-5706',
      storeEmail: 'info@bloomflowers.ca'
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
            contextType: 'event',
            contextId: data.eventId,
            templateData,
            businessHoursOnly: false // Event updates can go anytime
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
            contextType: 'event',
            contextId: data.eventId,
            templateData,
            businessHoursOnly: false
          })
        )
      }

      // Venue contact notification (for certain statuses)
      if (this.shouldNotifyVenueContact(data.status) && data.contactPerson && data.contactPhone) {
        notifications.push(
          this.notificationService.sendNotification({
            type: NotificationType.EVENT_REMINDER,
            channel: NotificationChannel.SMS,
            recipientType: RecipientType.VENDOR,
            recipientPhone: data.contactPhone,
            recipientName: data.contactPerson,
            contextType: 'event',
            contextId: data.eventId,
            message: `Bloom Flowers Event Update: Event ${data.eventNumber} (${data.eventName}) status changed to ${data.status}. Event Date: ${data.eventDate}. Contact us at (604) 217-5706 for any questions.`,
            businessHoursOnly: true
          })
        )
      }

      // Send all notifications
      const results = await Promise.allSettled(notifications)
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success)
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !(r.value as any).success))

      console.log(`✅ Event notifications sent: ${successful.length} successful, ${failed.length} failed`)
      
      if (failed.length > 0) {
        console.error('Failed event notifications:', failed)
      }

    } catch (error) {
      console.error('Error sending event status notifications:', error)
      throw error
    }
  }

  /**
   * Send quote sent notification
   */
  async sendQuoteSent(data: EventNotificationData): Promise<void> {
    await this.sendEventStatusNotification({
      ...data,
      status: 'QUOTE_SENT'
    })
  }

  /**
   * Send quote approved notification
   */
  async sendQuoteApproved(data: EventNotificationData): Promise<void> {
    await this.sendEventStatusNotification({
      ...data,
      status: 'QUOTE_APPROVED'
    })
  }

  /**
   * Send deposit received notification
   */
  async sendDepositReceived(data: EventNotificationData): Promise<void> {
    await this.sendEventStatusNotification({
      ...data,
      status: 'DEPOSIT_RECEIVED'
    })
  }

  /**
   * Send event in production notification
   */
  async sendEventInProduction(data: EventNotificationData): Promise<void> {
    await this.sendEventStatusNotification({
      ...data,
      status: 'IN_PRODUCTION'
    })
  }

  /**
   * Send ready for install notification
   */
  async sendReadyForInstall(data: EventNotificationData): Promise<void> {
    await this.sendEventStatusNotification({
      ...data,
      status: 'READY_FOR_INSTALL'
    })
  }

  /**
   * Send event installed notification
   */
  async sendEventInstalled(data: EventNotificationData): Promise<void> {
    await this.sendEventStatusNotification({
      ...data,
      status: 'INSTALLED'
    })
  }

  /**
   * Send event completed notification
   */
  async sendEventCompleted(data: EventNotificationData): Promise<void> {
    await this.sendEventStatusNotification({
      ...data,
      status: 'COMPLETED'
    })
  }

  /**
   * Send event cancelled notification
   */
  async sendEventCancelled(data: EventNotificationData): Promise<void> {
    await this.sendEventStatusNotification({
      ...data,
      status: 'CANCELLED'
    })
  }

  /**
   * Send event reminder (few days before event)
   */
  async sendEventReminder(data: EventNotificationData): Promise<void> {
    const templateData = {
      customerFirstName: data.customerFirstName || 'Customer',
      eventNumber: data.eventNumber.toString(),
      eventName: data.eventName,
      eventDate: data.eventDate,
      setupTime: data.setupTime,
      venue: data.venue,
      venueAddress: data.venueAddress,
      contactPerson: data.contactPerson,
      contactPhone: data.contactPhone,
      assignedStaffName: data.assignedStaffName || 'Bloom Team',
      storePhone: '(604) 217-5706'
    }

    const notifications: Promise<any>[] = []

    // Customer email reminder
    if (data.customerEmail) {
      notifications.push(
        this.notificationService.sendNotification({
          type: NotificationType.EVENT_REMINDER,
          channel: NotificationChannel.EMAIL,
          recipientType: RecipientType.CUSTOMER,
          recipientId: data.customerId,
          recipientEmail: data.customerEmail,
          recipientName: `${data.customerFirstName} ${data.customerLastName}`.trim(),
          contextType: 'event',
          contextId: data.eventId,
          templateData,
          businessHoursOnly: false
        })
      )
    }

    await Promise.allSettled(notifications)
  }

  /**
   * Map event status to notification type
   */
  private getNotificationTypeForStatus(status: string): NotificationType {
    const statusMap: Record<string, NotificationType> = {
      'INQUIRY': NotificationType.EVENT_INQUIRY_RECEIVED,
      'QUOTE_REQUESTED': NotificationType.EVENT_INQUIRY_RECEIVED,
      'QUOTE_SENT': NotificationType.EVENT_QUOTE_SENT,
      'QUOTE_APPROVED': NotificationType.EVENT_QUOTE_APPROVED,
      'DEPOSIT_RECEIVED': NotificationType.EVENT_DEPOSIT_RECEIVED,
      'IN_PRODUCTION': NotificationType.EVENT_STATUS_UPDATE,
      'READY_FOR_INSTALL': NotificationType.EVENT_STATUS_UPDATE,
      'INSTALLED': NotificationType.EVENT_STATUS_UPDATE,
      'COMPLETED': NotificationType.EVENT_COMPLETED,
      'CANCELLED': NotificationType.EVENT_CANCELLED,
      'REJECTED': NotificationType.EVENT_CANCELLED
    }

    return statusMap[status.toUpperCase()] || NotificationType.EVENT_STATUS_UPDATE
  }

  /**
   * Determine if venue contact should be notified for this status
   */
  private shouldNotifyVenueContact(status: string): boolean {
    const notifyStatuses = [
      'READY_FOR_INSTALL',
      'INSTALLED',
      'COMPLETED'
    ]
    return notifyStatuses.includes(status.toUpperCase())
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Quick function to send event notifications
 * Can be called from anywhere in the app
 */
export async function sendEventNotification(
  notificationService: NotificationService,
  eventData: EventNotificationData
): Promise<void> {
  const integration = new EventNotificationIntegration(notificationService)
  await integration.sendEventStatusNotification(eventData)
}

/**
 * React hook for event notifications
 */
export function useEventNotifications() {
  // This would be implemented to use the NotificationService
  // For now, return a placeholder
  return {
    sendEventStatusNotification: async (data: EventNotificationData) => {
      console.log('Event notification hook called:', data)
      // TODO: Implement with actual NotificationService instance
    },
    sendQuoteSent: async (data: EventNotificationData) => {
      console.log('Quote sent hook called:', data)
    },
    sendQuoteApproved: async (data: EventNotificationData) => {
      console.log('Quote approved hook called:', data)
    },
    sendEventCompleted: async (data: EventNotificationData) => {
      console.log('Event completed hook called:', data)
    },
    sendEventReminder: async (data: EventNotificationData) => {
      console.log('Event reminder hook called:', data)
    }
  }
}

// ===== INTEGRATION EXAMPLES =====

/*
// Example: Event status change in event management
import { sendEventNotification } from './integration/EventNotifications'
import { NotificationService } from './services/NotificationService'

const handleEventStatusChange = async (eventId: string, newStatus: string) => {
  const event = await getEventById(eventId)
  const customer = await getCustomerById(event.customerId)
  
  await sendEventNotification(notificationService, {
    eventId: event.id,
    eventNumber: event.eventNumber,
    eventName: event.eventName,
    eventType: event.eventType,
    status: newStatus,
    eventDate: event.eventDate,
    setupDate: event.setupDate,
    setupTime: event.setupTime,
    venue: event.venue,
    venueAddress: event.venueAddress,
    quotedAmount: event.quotedAmount,
    finalAmount: event.finalAmount,
    customerId: customer.id,
    customerFirstName: customer.firstName,
    customerLastName: customer.lastName,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    contactPerson: event.contactPerson,
    contactPhone: event.contactPhone,
    assignedStaffName: event.employee?.name
  })
}

// Example: Quote approval notification
import { useEventNotifications } from './integration/EventNotifications'

const EventQuoteModal = () => {
  const { sendQuoteApproved } = useEventNotifications()
  
  const handleQuoteApproval = async (event) => {
    await sendQuoteApproved({
      eventId: event.id,
      eventNumber: event.eventNumber,
      eventName: event.eventName,
      status: 'QUOTE_APPROVED',
      // ... other event data
    })
  }
}

// Example: Event reminder scheduler (cron job)
import { EventNotificationIntegration } from './integration/EventNotifications'

const sendEventReminders = async () => {
  const upcomingEvents = await getEventsInNextFewDays(3) // 3 days ahead
  
  for (const event of upcomingEvents) {
    const integration = new EventNotificationIntegration(notificationService)
    await integration.sendEventReminder({
      eventId: event.id,
      eventNumber: event.eventNumber,
      eventName: event.eventName,
      eventType: event.eventType,
      eventDate: event.eventDate,
      setupTime: event.setupTime,
      venue: event.venue,
      venueAddress: event.venueAddress,
      customerFirstName: event.customer.firstName,
      customerLastName: event.customer.lastName,
      customerEmail: event.customer.email,
      contactPerson: event.contactPerson,
      contactPhone: event.contactPhone,
      assignedStaffName: event.employee?.name
    })
  }
}
*/