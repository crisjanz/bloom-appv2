/**
 * Notification Service
 * Core business logic for sending notifications via multiple channels
 */

import { 
  Notification, 
  NotificationTemplate, 
  NotificationProvider,
  NotificationSettings,
  SendNotificationRequest,
  BulkNotificationRequest,
  NotificationResponse,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  RecipientType,
  NotificationHelper
} from '../entities/Notification'
import { DomainError } from '@shared/types/common'

// ===== PROVIDER INTERFACES =====

export interface SMSProvider {
  name: string
  sendSMS(phone: string, message: string, metadata?: Record<string, any>): Promise<{
    success: boolean
    providerId?: string
    error?: string
    estimatedDelivery?: string
  }>
  validatePhone(phone: string): boolean
  formatPhone(phone: string): string
}

export interface EmailProvider {
  name: string
  sendEmail(email: string, subject: string, body: string, metadata?: Record<string, any>): Promise<{
    success: boolean
    providerId?: string
    error?: string
    estimatedDelivery?: string
  }>
  validateEmail(email: string): boolean
}

export interface PushProvider {
  name: string
  sendPush(deviceToken: string, title: string, body: string, metadata?: Record<string, any>): Promise<{
    success: boolean
    providerId?: string
    error?: string
  }>
}

// ===== SERVICE INTERFACE =====

export interface INotificationService {
  // Core sending methods
  sendNotification(request: SendNotificationRequest): Promise<NotificationResponse>
  sendBulkNotifications(request: BulkNotificationRequest): Promise<{ batchId: string; results: NotificationResponse[] }>
  
  // Template methods
  renderTemplate(templateId: string, data: Record<string, any>): Promise<{ subject?: string; body: string }>
  
  // Provider management
  registerProvider(channel: NotificationChannel, provider: SMSProvider | EmailProvider | PushProvider): void
  
  // Retry and recovery
  retryFailedNotifications(): Promise<void>
  
  // Validation
  validateRecipient(channel: NotificationChannel, recipient: string): boolean
}

// ===== CONCRETE IMPLEMENTATION =====

export class NotificationService implements INotificationService {
  private smsProviders: Map<string, SMSProvider> = new Map()
  private emailProviders: Map<string, EmailProvider> = new Map()
  private pushProviders: Map<string, PushProvider> = new Map()
  
  private notificationRepository: any // TODO: Import when repository is created
  private templateRepository: any // TODO: Import when repository is created
  private settingsRepository: any // TODO: Import when repository is created

  constructor(
    notificationRepository: any,
    templateRepository: any,
    settingsRepository: any
  ) {
    this.notificationRepository = notificationRepository
    this.templateRepository = templateRepository
    this.settingsRepository = settingsRepository
  }

  // ===== CORE SENDING METHODS =====

  async sendNotification(request: SendNotificationRequest): Promise<NotificationResponse> {
    try {
      // Validate request
      const validation = await this.validateRequest(request)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Check global settings
      const settings = await this.settingsRepository.getSettings()
      if (!this.isChannelEnabled(request.channel, settings)) {
        return {
          success: false,
          error: `${request.channel} notifications are disabled globally`
        }
      }

      // Check business hours
      if (request.businessHoursOnly && !NotificationHelper.isBusinessHours(settings)) {
        // Schedule for later
        const notification = await this.createPendingNotification(request)
        await this.scheduleForBusinessHours(notification, settings)
        return {
          success: true,
          notificationId: notification.id,
          estimatedDelivery: this.getNextBusinessHoursTime(settings)
        }
      }

      // Create notification record
      const notification = await this.createNotification(request)

      try {
        // Send via appropriate provider
        const result = await this.sendViaProvider(notification)
        
        // Update notification status
        await this.updateNotificationStatus(notification.id, {
          status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
          providerId: result.providerId,
          sentAt: result.success ? new Date().toISOString() : undefined,
          failedAt: result.success ? undefined : new Date().toISOString(),
          errorMessage: result.error,
          providerResponse: result
        })

        return {
          success: result.success,
          notificationId: notification.id,
          providerId: result.providerId,
          error: result.error,
          estimatedDelivery: result.estimatedDelivery
        }

      } catch (error) {
        // Handle sending errors
        await this.updateNotificationStatus(notification.id, {
          status: NotificationStatus.FAILED,
          failedAt: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })

        return {
          success: false,
          notificationId: notification.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async sendBulkNotifications(request: BulkNotificationRequest): Promise<{ batchId: string; results: NotificationResponse[] }> {
    // Create batch record
    const batch = await this.notificationRepository.createBatch({
      name: request.batchName || `Bulk ${request.type}`,
      type: request.type,
      channel: request.channel,
      totalRecipients: request.recipients.length,
      templateId: request.templateId,
      templateData: request.templateData,
      scheduledAt: request.scheduledAt,
      businessHoursOnly: request.businessHoursOnly || false,
      employeeId: 'system' // TODO: Get from context
    })

    const results: NotificationResponse[] = []

    // Process each recipient
    for (const recipient of request.recipients) {
      const individualRequest: SendNotificationRequest = {
        type: request.type,
        channel: request.channel,
        recipientType: recipient.recipientType,
        recipientId: recipient.recipientId,
        recipientEmail: recipient.recipientEmail,
        recipientPhone: recipient.recipientPhone,
        recipientName: recipient.recipientName,
        templateId: request.templateId,
        templateData: { ...request.templateData, ...recipient.customData },
        scheduledAt: request.scheduledAt,
        businessHoursOnly: request.businessHoursOnly
      }

      const result = await this.sendNotification(individualRequest)
      results.push(result)

      // Update batch stats
      if (result.success) {
        await this.notificationRepository.incrementBatchSent(batch.id)
      } else {
        await this.notificationRepository.incrementBatchFailed(batch.id)
      }
    }

    // Mark batch as completed
    await this.notificationRepository.updateBatch(batch.id, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString()
    })

    return {
      batchId: batch.id,
      results
    }
  }

  // ===== TEMPLATE METHODS =====

  async renderTemplate(templateId: string, data: Record<string, any>): Promise<{ subject?: string; body: string }> {
    const template = await this.templateRepository.findById(templateId)
    if (!template) {
      throw new DomainError(`Template not found: ${templateId}`)
    }

    // Simple template rendering for now
    const subject = template.subject ? NotificationHelper.renderTemplate(template.subject, data) : undefined
    const body = NotificationHelper.renderTemplate(template.body, data)

    return { subject, body }
  }

  // ===== PROVIDER MANAGEMENT =====

  registerProvider(channel: NotificationChannel, provider: SMSProvider | EmailProvider | PushProvider): void {
    switch (channel) {
      case NotificationChannel.SMS:
        this.smsProviders.set(provider.name, provider as SMSProvider)
        break
      case NotificationChannel.EMAIL:
        this.emailProviders.set(provider.name, provider as EmailProvider)
        break
      case NotificationChannel.PUSH:
        this.pushProviders.set(provider.name, provider as PushProvider)
        break
      default:
        throw new DomainError(`Unsupported channel: ${channel}`)
    }
  }

  // ===== RETRY AND RECOVERY =====

  async retryFailedNotifications(): Promise<void> {
    const failedNotifications = await this.notificationRepository.findFailedNotifications()
    const settings = await this.settingsRepository.getSettings()

    for (const notification of failedNotifications) {
      if (!NotificationHelper.shouldRetry(notification)) {
        continue
      }

      // Calculate retry delay
      const nextRetryDelay = NotificationHelper.getNextRetryDelay(
        notification.retryCount,
        settings.retrySettings.retryDelayMinutes
      )

      // Check if enough time has passed
      const lastFailedTime = new Date(notification.failedAt!).getTime()
      const now = Date.now()
      const delayMs = nextRetryDelay * 60 * 1000

      if (now - lastFailedTime < delayMs) {
        continue // Not time to retry yet
      }

      // Update retry count and status
      await this.updateNotificationStatus(notification.id, {
        status: NotificationStatus.RETRYING,
        retryCount: notification.retryCount + 1
      })

      // Attempt to resend
      try {
        const result = await this.sendViaProvider(notification)
        
        await this.updateNotificationStatus(notification.id, {
          status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
          providerId: result.providerId,
          sentAt: result.success ? new Date().toISOString() : undefined,
          failedAt: result.success ? undefined : new Date().toISOString(),
          errorMessage: result.error,
          providerResponse: result
        })

      } catch (error) {
        await this.updateNotificationStatus(notification.id, {
          status: NotificationStatus.FAILED,
          failedAt: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : 'Retry failed'
        })
      }
    }
  }

  // ===== VALIDATION =====

  validateRecipient(channel: NotificationChannel, recipient: string): boolean {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return NotificationHelper.validateEmail(recipient)
      case NotificationChannel.SMS:
        return NotificationHelper.validatePhone(recipient)
      default:
        return recipient.length > 0
    }
  }

  // ===== PRIVATE METHODS =====

  private async validateRequest(request: SendNotificationRequest): Promise<{ isValid: boolean; error?: string }> {
    // Check recipient information
    if (request.channel === NotificationChannel.EMAIL && !request.recipientEmail) {
      return { isValid: false, error: 'Email address is required for email notifications' }
    }

    if (request.channel === NotificationChannel.SMS && !request.recipientPhone) {
      return { isValid: false, error: 'Phone number is required for SMS notifications' }
    }

    // Validate recipient format
    if (request.recipientEmail && !this.validateRecipient(NotificationChannel.EMAIL, request.recipientEmail)) {
      return { isValid: false, error: 'Invalid email address format' }
    }

    if (request.recipientPhone && !this.validateRecipient(NotificationChannel.SMS, request.recipientPhone)) {
      return { isValid: false, error: 'Invalid phone number format' }
    }

    // Check content
    if (!request.templateId && !request.message) {
      return { isValid: false, error: 'Either template ID or message content is required' }
    }

    return { isValid: true }
  }

  private isChannelEnabled(channel: NotificationChannel, settings: NotificationSettings): boolean {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return settings.globalEmailEnabled
      case NotificationChannel.SMS:
        return settings.globalSmsEnabled
      case NotificationChannel.PUSH:
        return settings.globalPushEnabled
      default:
        return false
    }
  }

  private async createNotification(request: SendNotificationRequest): Promise<Notification> {
    let content = { subject: request.subject, body: request.message || '' }

    // Render template if provided
    if (request.templateId) {
      content = await this.renderTemplate(request.templateId, request.templateData || {})
    }

    const notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'> = {
      type: request.type,
      channel: request.channel,
      priority: request.priority || 'NORMAL',
      recipientType: request.recipientType,
      recipientId: request.recipientId,
      recipientEmail: request.recipientEmail,
      recipientPhone: request.recipientPhone,
      recipientName: request.recipientName,
      subject: content.subject,
      message: content.body,
      templateId: request.templateId,
      templateData: request.templateData,
      status: NotificationStatus.PENDING,
      scheduledAt: request.scheduledAt,
      retryCount: 0,
      maxRetries: request.maxRetries || 3,
      contextType: request.contextType,
      contextId: request.contextId,
      businessHoursOnly: request.businessHoursOnly || false,
      metadata: request.metadata,
      employeeId: 'system' // TODO: Get from context
    }

    return await this.notificationRepository.create(notification)
  }

  private async createPendingNotification(request: SendNotificationRequest): Promise<Notification> {
    const notification = await this.createNotification(request)
    await this.updateNotificationStatus(notification.id, {
      status: NotificationStatus.PENDING,
      scheduledAt: this.getNextBusinessHoursTime(await this.settingsRepository.getSettings())
    })
    return notification
  }

  private async sendViaProvider(notification: Notification): Promise<{
    success: boolean
    providerId?: string
    error?: string
    estimatedDelivery?: string
  }> {
    switch (notification.channel) {
      case NotificationChannel.SMS:
        return await this.sendViaSMS(notification)
      case NotificationChannel.EMAIL:
        return await this.sendViaEmail(notification)
      case NotificationChannel.PUSH:
        return await this.sendViaPush(notification)
      default:
        throw new DomainError(`Unsupported channel: ${notification.channel}`)
    }
  }

  private async sendViaSMS(notification: Notification): Promise<any> {
    const providers = Array.from(this.smsProviders.values())
    if (providers.length === 0) {
      throw new DomainError('No SMS providers configured')
    }

    // Try primary provider first, then fallback
    for (const provider of providers) {
      try {
        return await provider.sendSMS(
          notification.recipientPhone!,
          notification.message,
          {
            notificationId: notification.id,
            type: notification.type,
            recipientType: notification.recipientType
          }
        )
      } catch (error) {
        console.error(`SMS provider ${provider.name} failed:`, error)
        // Continue to next provider
      }
    }

    throw new DomainError('All SMS providers failed')
  }

  private async sendViaEmail(notification: Notification): Promise<any> {
    const providers = Array.from(this.emailProviders.values())
    if (providers.length === 0) {
      throw new DomainError('No email providers configured')
    }

    // Try primary provider first, then fallback
    for (const provider of providers) {
      try {
        return await provider.sendEmail(
          notification.recipientEmail!,
          notification.subject || 'Notification',
          notification.message,
          {
            notificationId: notification.id,
            type: notification.type,
            recipientType: notification.recipientType
          }
        )
      } catch (error) {
        console.error(`Email provider ${provider.name} failed:`, error)
        // Continue to next provider
      }
    }

    throw new DomainError('All email providers failed')
  }

  private async sendViaPush(notification: Notification): Promise<any> {
    const providers = Array.from(this.pushProviders.values())
    if (providers.length === 0) {
      throw new DomainError('No push providers configured')
    }

    // TODO: Implement push notification logic
    throw new DomainError('Push notifications not yet implemented')
  }

  private async updateNotificationStatus(id: string, updates: Partial<Notification>): Promise<void> {
    await this.notificationRepository.update(id, updates)
  }

  private async scheduleForBusinessHours(notification: Notification, settings: NotificationSettings): Promise<void> {
    // TODO: Implement scheduling logic
    console.log('Scheduling notification for business hours:', notification.id)
  }

  private getNextBusinessHoursTime(settings: NotificationSettings): string {
    // TODO: Calculate next business hours time
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
  }
}

// ===== PROVIDER IMPLEMENTATIONS =====

// Twilio SMS Provider Example
export class TwilioSMSProvider implements SMSProvider {
  name = 'twilio'
  
  constructor(
    private accountSid: string,
    private authToken: string,
    private fromNumber: string
  ) {}

  async sendSMS(phone: string, message: string, metadata?: Record<string, any>): Promise<{
    success: boolean
    providerId?: string
    error?: string
    estimatedDelivery?: string
  }> {
    try {
      // TODO: Implement actual Twilio API call
      console.log('Sending SMS via Twilio:', { phone, message, metadata })
      
      // Simulate API call
      return {
        success: true,
        providerId: `twilio_${Date.now()}`,
        estimatedDelivery: new Date(Date.now() + 30000).toISOString() // 30 seconds
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Twilio error'
      }
    }
  }

  validatePhone(phone: string): boolean {
    return NotificationHelper.validatePhone(phone)
  }

  formatPhone(phone: string): string {
    return NotificationHelper.formatPhone(phone)
  }
}

// SendGrid Email Provider Example
export class SendGridEmailProvider implements EmailProvider {
  name = 'sendgrid'
  
  constructor(
    private apiKey: string,
    private fromEmail: string,
    private fromName: string
  ) {}

  async sendEmail(email: string, subject: string, body: string, metadata?: Record<string, any>): Promise<{
    success: boolean
    providerId?: string
    error?: string
    estimatedDelivery?: string
  }> {
    try {
      // TODO: Implement actual SendGrid API call
      console.log('Sending email via SendGrid:', { email, subject, body, metadata })
      
      // Simulate API call
      return {
        success: true,
        providerId: `sendgrid_${Date.now()}`,
        estimatedDelivery: new Date(Date.now() + 10000).toISOString() // 10 seconds
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SendGrid error'
      }
    }
  }

  validateEmail(email: string): boolean {
    return NotificationHelper.validateEmail(email)
  }
}