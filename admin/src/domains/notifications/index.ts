/**
 * Notifications Domain - Index
 * Exports all notification domain components
 */

// ===== ENTITIES =====
export * from './entities/Notification'

// ===== SERVICES =====
export * from './services/NotificationService'

// ===== REPOSITORIES =====
export * from './repositories/NotificationRepository'

// ===== HOOKS =====
export * from './hooks/useNotifications'

// ===== DOMAIN INFO =====
export const NOTIFICATIONS_DOMAIN = {
  name: 'notifications',
  version: '1.0.0',
  description: 'Unified notification system for SMS, email, and future channels',
  entities: [
    'Notification',
    'NotificationTemplate', 
    'NotificationProvider',
    'NotificationSettings',
    'NotificationLog',
    'NotificationBatch'
  ],
  channels: [
    'EMAIL',
    'SMS', 
    'PUSH',
    'IN_APP',
    'WEBHOOK'
  ],
  features: [
    'Multi-channel notifications',
    'Template system with token replacement',
    'Provider abstraction and failover',
    'Delivery tracking and analytics',
    'Business hours scheduling',
    'Retry mechanisms',
    'Bulk notifications',
    'Comprehensive settings management'
  ]
} as const