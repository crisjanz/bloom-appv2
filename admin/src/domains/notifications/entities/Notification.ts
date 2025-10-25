/**
 * Notifications Domain Entities
 * Unified notification system for SMS, email, and future channels
 */

import { DomainEntity } from '@shared/types/common'

// ===== ENUMS =====

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH', // Future: push notifications
  IN_APP = 'IN_APP', // Future: in-app notifications
  WEBHOOK = 'WEBHOOK' // Future: webhook notifications
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED', // Email bounced
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  RETRYING = 'RETRYING'
}

export enum NotificationType {
  // Order notifications
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_STATUS_UPDATE = 'ORDER_STATUS_UPDATE',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  
  // Event notifications
  EVENT_STATUS_UPDATE = 'EVENT_STATUS_UPDATE',
  EVENT_QUOTE_SENT = 'EVENT_QUOTE_SENT',
  EVENT_QUOTE_APPROVED = 'EVENT_QUOTE_APPROVED',
  EVENT_INSTALLATION_SCHEDULED = 'EVENT_INSTALLATION_SCHEDULED',
  EVENT_REMINDER = 'EVENT_REMINDER',
  EVENT_INQUIRY_RECEIVED = 'EVENT_INQUIRY_RECEIVED',
  EVENT_DEPOSIT_RECEIVED = 'EVENT_DEPOSIT_RECEIVED',
  EVENT_COMPLETED = 'EVENT_COMPLETED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  
  // Payment notifications
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  RECEIPT_EMAIL = 'RECEIPT_EMAIL',
  RECEIPT_SMS = 'RECEIPT_SMS',
  
  // Marketing notifications
  PROMOTIONAL = 'PROMOTIONAL',
  NEWSLETTER = 'NEWSLETTER',
  BIRTHDAY_GREETING = 'BIRTHDAY_GREETING',
  
  // System notifications
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  SYSTEM_ALERT = 'SYSTEM_ALERT'
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum RecipientType {
  CUSTOMER = 'CUSTOMER',
  RECIPIENT = 'RECIPIENT', // Delivery recipient
  EMPLOYEE = 'EMPLOYEE',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
  VENDOR = 'VENDOR'
}

export enum TemplateEngine {
  HANDLEBARS = 'HANDLEBARS',
  SIMPLE = 'SIMPLE' // Simple {{token}} replacement
}

// ===== CORE ENTITIES =====

export interface Notification extends DomainEntity {
  // Classification
  type: NotificationType
  channel: NotificationChannel
  priority: NotificationPriority
  
  // Recipient information
  recipientType: RecipientType
  recipientId?: string // Customer/Employee ID
  recipientEmail?: string
  recipientPhone?: string
  recipientName?: string
  
  // Content
  subject?: string // For email
  message: string
  templateId?: string
  templateData?: Record<string, any>
  
  // Delivery tracking
  status: NotificationStatus
  scheduledAt?: string // ISO timestamp
  sentAt?: string // ISO timestamp
  deliveredAt?: string // ISO timestamp
  failedAt?: string // ISO timestamp
  
  // Error handling
  errorMessage?: string
  retryCount: number
  maxRetries: number
  
  // Context
  contextType?: string // 'order', 'event', 'payment', etc.
  contextId?: string // ID of the related entity
  
  // Provider tracking
  providerId?: string // External provider message ID
  providerResponse?: Record<string, any>
  
  // Metadata
  metadata?: Record<string, any>
  businessHoursOnly: boolean
  employeeId?: string // Who triggered the notification
}

export interface NotificationTemplate extends DomainEntity {
  // Template identification
  name: string
  slug: string // Unique identifier for code reference
  type: NotificationType
  channel: NotificationChannel
  
  // Template content
  subject?: string // For email templates
  body: string
  engine: TemplateEngine
  
  // Configuration
  isActive: boolean
  isDefault: boolean // Default template for this type+channel
  businessHoursOnly: boolean
  
  // Targeting
  recipientTypes: RecipientType[]
  
  // Metadata
  description?: string
  version: number
  variables: NotificationVariable[] // Available template variables
}

export interface NotificationVariable {
  name: string
  description: string
  example: string
  required: boolean
  type: 'string' | 'number' | 'date' | 'boolean'
  category: string // 'customer', 'order', 'payment', etc.
}

export interface NotificationProvider extends DomainEntity {
  // Provider details
  name: string
  type: NotificationChannel
  slug: string // 'sendgrid', 'twilio', etc.
  
  // Configuration
  isActive: boolean
  isPrimary: boolean // Primary provider for this channel
  
  // Settings
  settings: Record<string, any>
  rateLimit?: {
    maxPerMinute: number
    maxPerHour: number
    maxPerDay: number
  }
  
  // Health tracking
  lastHealthCheck?: string
  isHealthy: boolean
  healthCheckUrl?: string
  
  // Statistics
  totalSent: number
  totalDelivered: number
  totalFailed: number
  deliveryRate: number // Percentage
  lastUsedAt?: string
}

export interface NotificationSettings extends DomainEntity {
  // Global settings
  globalEmailEnabled: boolean
  globalSmsEnabled: boolean
  globalPushEnabled: boolean
  businessHoursOnly: boolean
  
  // Business hours
  businessHours: {
    timezone: string
    monday: { start: string; end: string } | null
    tuesday: { start: string; end: string } | null
    wednesday: { start: string; end: string } | null
    thursday: { start: string; end: string } | null
    friday: { start: string; end: string } | null
    saturday: { start: string; end: string } | null
    sunday: { start: string; end: string } | null
  }
  
  // Rate limiting
  rateLimits: {
    emailPerHour: number
    smsPerHour: number
    emailPerDay: number
    smsPerDay: number
  }
  
  // Retry settings
  retrySettings: {
    maxRetries: number
    retryDelayMinutes: number[]
  }
  
  // Opt-out management
  unsubscribeEnabled: boolean
  unsubscribeUrl?: string
  
  // Compliance
  includeUnsubscribeLink: boolean
  requireDoubleOptIn: boolean
  
  // Type-specific settings
  orderNotifications: OrderNotificationSettings
  eventNotifications: EventNotificationSettings
  marketingNotifications: MarketingNotificationSettings
}

type BusinessDayKey = Exclude<keyof NotificationSettings['businessHours'], 'timezone'>
const BUSINESS_DAY_KEYS: BusinessDayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
]

export interface OrderNotificationSettings {
  customerEmailEnabled: boolean
  customerSmsEnabled: boolean
  recipientEmailEnabled: boolean
  recipientSmsEnabled: boolean
  
  // Status-specific settings
  statusSettings: Record<string, {
    customerEmail: boolean
    customerSms: boolean
    recipientEmail: boolean
    recipientSms: boolean
    templateId?: string
  }>
}

export interface EventNotificationSettings {
  customerEmailEnabled: boolean
  customerSmsEnabled: boolean
  employeeEmailEnabled: boolean
  
  // Status-specific settings
  statusSettings: Record<string, {
    customerEmail: boolean
    customerSms: boolean
    employeeEmail: boolean
    templateId?: string
  }>
}

export interface MarketingNotificationSettings {
  enabled: boolean
  requireOptIn: boolean
  honorGlobalUnsubscribe: boolean
  
  // Frequency limits
  maxEmailsPerWeek: number
  maxSmsPerMonth: number
}

export interface NotificationLog extends DomainEntity {
  notificationId: string
  event: string // 'created', 'sent', 'delivered', 'failed', etc.
  details?: string
  providerResponse?: Record<string, any>
  timestamp: string
}

export interface NotificationBatch extends DomainEntity {
  name: string
  type: NotificationType
  channel: NotificationChannel
  
  // Batch details
  totalRecipients: number
  totalSent: number
  totalDelivered: number
  totalFailed: number
  
  // Status
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  startedAt?: string
  completedAt?: string
  
  // Configuration
  templateId: string
  templateData?: Record<string, any>
  
  // Scheduling
  scheduledAt?: string
  businessHoursOnly: boolean
  
  // Metadata
  employeeId: string // Who created the batch
  description?: string
}

// ===== SEARCH AND FILTER INTERFACES =====

export interface NotificationSearchFilters {
  query?: string
  type?: NotificationType
  channel?: NotificationChannel
  status?: NotificationStatus
  recipientType?: RecipientType
  recipientId?: string
  contextType?: string
  contextId?: string
  dateFrom?: string
  dateTo?: string
  priority?: NotificationPriority
  employeeId?: string
}

export interface NotificationSearchResult {
  notifications: Notification[]
  total: number
  filters: NotificationSearchFilters
}

// ===== ANALYTICS INTERFACES =====

export interface NotificationAnalytics {
  totalNotifications: number
  totalSent: number
  totalDelivered: number
  totalFailed: number
  deliveryRate: number
  
  // Channel breakdown
  channelBreakdown: Record<NotificationChannel, {
    sent: number
    delivered: number
    failed: number
    deliveryRate: number
  }>
  
  // Type breakdown
  typeBreakdown: Record<NotificationType, {
    sent: number
    delivered: number
    failed: number
  }>
  
  // Recent activity
  recentActivity: Array<{
    date: string
    sent: number
    delivered: number
    failed: number
  }>
  
  // Top failure reasons
  failureReasons: Array<{
    reason: string
    count: number
    percentage: number
  }>
  
  // Provider performance
  providerPerformance: Array<{
    providerId: string
    providerName: string
    sent: number
    delivered: number
    failed: number
    deliveryRate: number
    avgResponseTime: number
  }>
}

// ===== REQUEST/RESPONSE INTERFACES =====

export interface SendNotificationRequest {
  type: NotificationType
  channel: NotificationChannel
  priority?: NotificationPriority
  
  // Recipient
  recipientType: RecipientType
  recipientId?: string
  recipientEmail?: string
  recipientPhone?: string
  recipientName?: string
  
  // Content (either template-based or direct)
  templateId?: string
  templateData?: Record<string, any>
  subject?: string
  message?: string
  
  // Scheduling
  scheduledAt?: string
  businessHoursOnly?: boolean
  
  // Context
  contextType?: string
  contextId?: string
  
  // Options
  maxRetries?: number
  metadata?: Record<string, any>
}

export interface BulkNotificationRequest {
  type: NotificationType
  channel: NotificationChannel
  templateId: string
  templateData?: Record<string, any>
  
  // Recipients
  recipients: Array<{
    recipientType: RecipientType
    recipientId?: string
    recipientEmail?: string
    recipientPhone?: string
    recipientName?: string
    customData?: Record<string, any>
  }>
  
  // Options
  batchName?: string
  scheduledAt?: string
  businessHoursOnly?: boolean
}

export interface NotificationResponse {
  success: boolean
  notificationId?: string
  providerId?: string
  error?: string
  estimatedDelivery?: string
}

// ===== HELPER FUNCTIONS =====

export class NotificationHelper {
  static getStatusColor(status: NotificationStatus): string {
    const colors = {
      [NotificationStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      [NotificationStatus.SENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      [NotificationStatus.DELIVERED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      [NotificationStatus.FAILED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      [NotificationStatus.BOUNCED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      [NotificationStatus.UNSUBSCRIBED]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      [NotificationStatus.RETRYING]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }

  static getChannelIcon(channel: NotificationChannel): string {
    const icons = {
      [NotificationChannel.EMAIL]: '📧',
      [NotificationChannel.SMS]: '📱',
      [NotificationChannel.PUSH]: '🔔',
      [NotificationChannel.IN_APP]: '💬',
      [NotificationChannel.WEBHOOK]: '🔗'
    }
    return icons[channel] || '📄'
  }

  static getTypeDisplayName(type: NotificationType): string {
    const names = {
      [NotificationType.ORDER_CONFIRMATION]: 'Order Confirmation',
      [NotificationType.ORDER_STATUS_UPDATE]: 'Order Status Update',
      [NotificationType.ORDER_COMPLETED]: 'Order Completed',
      [NotificationType.ORDER_CANCELLED]: 'Order Cancelled',
      [NotificationType.EVENT_STATUS_UPDATE]: 'Event Status Update',
      [NotificationType.EVENT_QUOTE_SENT]: 'Event Quote Sent',
      [NotificationType.EVENT_QUOTE_APPROVED]: 'Event Quote Approved',
      [NotificationType.EVENT_INSTALLATION_SCHEDULED]: 'Installation Scheduled',
      [NotificationType.PAYMENT_RECEIVED]: 'Payment Received',
      [NotificationType.PAYMENT_FAILED]: 'Payment Failed',
      [NotificationType.RECEIPT_EMAIL]: 'Email Receipt',
      [NotificationType.RECEIPT_SMS]: 'SMS Receipt',
      [NotificationType.PROMOTIONAL]: 'Promotional',
      [NotificationType.NEWSLETTER]: 'Newsletter',
      [NotificationType.BIRTHDAY_GREETING]: 'Birthday Greeting',
      [NotificationType.ACCOUNT_CREATED]: 'Account Created',
      [NotificationType.PASSWORD_RESET]: 'Password Reset',
      [NotificationType.SYSTEM_ALERT]: 'System Alert'
    }
    return names[type] || type
  }

  static renderTemplate(template: string, data: Record<string, any>): string {
    // Simple template engine for {{token}} replacement
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match
    })
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  static validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)\.]{10,}$/
    return phone.length >= 10 && phoneRegex.test(phone)
  }

  static formatPhone(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX for 10-digit numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    
    // Format with country code for 11+ digit numbers
    if (digits.length === 11 && digits[0] === '1') {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    
    return phone // Return original if can't format
  }

  static calculateDeliveryRate(sent: number, delivered: number): number {
    if (sent === 0) return 0
    return Math.round((delivered / sent) * 100)
  }

  static isBusinessHours(settings: NotificationSettings): boolean {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayName = BUSINESS_DAY_KEYS[dayOfWeek]
    
    if (!dayName) {
      return false
    }

    const businessDay = settings.businessHours[dayName]
    if (!businessDay) return false
    
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    return currentTime >= businessDay.start && currentTime <= businessDay.end
  }

  static shouldRetry(notification: Notification): boolean {
    return notification.retryCount < notification.maxRetries &&
           notification.status === NotificationStatus.FAILED
  }

  static getNextRetryDelay(retryCount: number, retryDelayMinutes: number[]): number {
    if (retryCount >= retryDelayMinutes.length) {
      return retryDelayMinutes[retryDelayMinutes.length - 1]
    }
    return retryDelayMinutes[retryCount]
  }

  static extractTemplateVariables(template: string): string[] {
    const matches = template.match(/\{\{(\w+)\}\}/g)
    if (!matches) return []
    
    return matches.map(match => match.replace(/\{\{|\}\}/g, ''))
  }
}

// ===== TYPE GUARDS =====

export function isNotificationChannel(value: string): value is NotificationChannel {
  return Object.values(NotificationChannel).includes(value as NotificationChannel)
}

export function isNotificationStatus(value: string): value is NotificationStatus {
  return Object.values(NotificationStatus).includes(value as NotificationStatus)
}

export function isNotificationType(value: string): value is NotificationType {
  return Object.values(NotificationType).includes(value as NotificationType)
}

export function isRecipientType(value: string): value is RecipientType {
  return Object.values(RecipientType).includes(value as RecipientType)
}
