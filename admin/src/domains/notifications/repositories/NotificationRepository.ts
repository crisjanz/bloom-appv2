/**
 * Notification Repository
 * Data access layer for notification entities with delivery tracking
 */

import { 
  Notification, 
  NotificationTemplate, 
  NotificationProvider,
  NotificationSettings,
  NotificationLog,
  NotificationBatch,
  NotificationSearchFilters,
  NotificationSearchResult,
  NotificationAnalytics,
  NotificationChannel,
  NotificationStatus,
  NotificationType
} from '../entities/Notification'
import { Repository, SearchOptions, PaginatedResult } from '@shared/types/common'

// ===== REPOSITORY INTERFACES =====

export interface INotificationRepository extends Repository<Notification> {
  // Search and filtering
  search(filters: NotificationSearchFilters, options?: SearchOptions): Promise<NotificationSearchResult>
  findByRecipient(recipientType: string, recipientId: string, options?: SearchOptions): Promise<Notification[]>
  findByContext(contextType: string, contextId: string, options?: SearchOptions): Promise<Notification[]>
  findByStatus(status: NotificationStatus, options?: SearchOptions): Promise<Notification[]>
  findFailedNotifications(options?: SearchOptions): Promise<Notification[]>
  findPendingNotifications(): Promise<Notification[]>
  findScheduledNotifications(before?: string): Promise<Notification[]>
  
  // Analytics and reporting
  getAnalytics(dateFrom?: string, dateTo?: string): Promise<NotificationAnalytics>
  getDeliveryRates(channel?: NotificationChannel, dateFrom?: string, dateTo?: string): Promise<{
    channel: NotificationChannel
    sent: number
    delivered: number
    failed: number
    deliveryRate: number
  }[]>
  
  // Bulk operations
  markAsDelivered(notificationIds: string[]): Promise<void>
  markAsFailed(notificationIds: string[], error?: string): Promise<void>
  bulkUpdateStatus(notificationIds: string[], status: NotificationStatus): Promise<void>
  
  // Cleanup and maintenance
  deleteOldNotifications(olderThanDays: number): Promise<number>
  archiveCompletedNotifications(olderThanDays: number): Promise<number>
}

export interface INotificationTemplateRepository extends Repository<NotificationTemplate> {
  findByType(type: NotificationType): Promise<NotificationTemplate[]>
  findByChannel(channel: NotificationChannel): Promise<NotificationTemplate[]>
  findBySlug(slug: string): Promise<NotificationTemplate | null>
  findDefault(type: NotificationType, channel: NotificationChannel): Promise<NotificationTemplate | null>
  getActiveTemplates(): Promise<NotificationTemplate[]>
}

export interface INotificationProviderRepository extends Repository<NotificationProvider> {
  findByChannel(channel: NotificationChannel): Promise<NotificationProvider[]>
  findPrimary(channel: NotificationChannel): Promise<NotificationProvider | null>
  findBySlug(slug: string): Promise<NotificationProvider | null>
  getActiveProviders(): Promise<NotificationProvider[]>
  updateHealthStatus(id: string, isHealthy: boolean, lastCheck?: string): Promise<void>
}

export interface INotificationSettingsRepository {
  getSettings(): Promise<NotificationSettings>
  updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings>
  getOrderNotificationSettings(): Promise<any>
  updateOrderNotificationSettings(settings: any): Promise<void>
  getEventNotificationSettings(): Promise<any>
  updateEventNotificationSettings(settings: any): Promise<void>
}

export interface INotificationLogRepository extends Repository<NotificationLog> {
  findByNotificationId(notificationId: string): Promise<NotificationLog[]>
  logEvent(notificationId: string, event: string, details?: string, providerResponse?: Record<string, any>): Promise<NotificationLog>
}

export interface INotificationBatchRepository extends Repository<NotificationBatch> {
  findByStatus(status: string): Promise<NotificationBatch[]>
  incrementSent(id: string): Promise<void>
  incrementDelivered(id: string): Promise<void>
  incrementFailed(id: string): Promise<void>
  updateStatus(id: string, status: string, completedAt?: string): Promise<void>
}

// ===== CONCRETE IMPLEMENTATIONS =====

export class NotificationRepository implements INotificationRepository {
  constructor(private apiClient: any) {} // TODO: Type the API client

  // ===== BASIC CRUD =====

  async create(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification> {
    const response = await this.apiClient.post('/api/notifications', notification)
    return response.data
  }

  async findById(id: string): Promise<Notification | null> {
    try {
      const response = await this.apiClient.get(`/api/notifications/${id}`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  }

  async findMany(ids: string[]): Promise<Notification[]> {
    const response = await this.apiClient.post('/api/notifications/batch', { ids })
    return response.data
  }

  async update(id: string, updates: Partial<Notification>): Promise<Notification> {
    const response = await this.apiClient.patch(`/api/notifications/${id}`, updates)
    return response.data
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/notifications/${id}`)
  }

  async findAll(options?: SearchOptions): Promise<PaginatedResult<Notification>> {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.sortBy) params.append('sortBy', options.sortBy)
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder)

    const response = await this.apiClient.get(`/api/notifications?${params}`)
    return response.data
  }

  // ===== SEARCH AND FILTERING =====

  async search(filters: NotificationSearchFilters, options?: SearchOptions): Promise<NotificationSearchResult> {
    const params = new URLSearchParams()
    
    // Add search filters
    if (filters.query) params.append('query', filters.query)
    if (filters.type) params.append('type', filters.type)
    if (filters.channel) params.append('channel', filters.channel)
    if (filters.status) params.append('status', filters.status)
    if (filters.recipientType) params.append('recipientType', filters.recipientType)
    if (filters.recipientId) params.append('recipientId', filters.recipientId)
    if (filters.contextType) params.append('contextType', filters.contextType)
    if (filters.contextId) params.append('contextId', filters.contextId)
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.append('dateTo', filters.dateTo)
    if (filters.priority) params.append('priority', filters.priority)
    if (filters.employeeId) params.append('employeeId', filters.employeeId)

    // Add pagination options
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.sortBy) params.append('sortBy', options.sortBy)
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder)

    const response = await this.apiClient.get(`/api/notifications/search?${params}`)
    return {
      notifications: response.data.data,
      total: response.data.total,
      filters
    }
  }

  async findByRecipient(recipientType: string, recipientId: string, options?: SearchOptions): Promise<Notification[]> {
    const params = new URLSearchParams()
    params.append('recipientType', recipientType)
    params.append('recipientId', recipientId)
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.sortBy) params.append('sortBy', options.sortBy)
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder)

    const response = await this.apiClient.get(`/api/notifications/by-recipient?${params}`)
    return response.data
  }

  async findByContext(contextType: string, contextId: string, options?: SearchOptions): Promise<Notification[]> {
    const params = new URLSearchParams()
    params.append('contextType', contextType)
    params.append('contextId', contextId)
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.sortBy) params.append('sortBy', options.sortBy)
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder)

    const response = await this.apiClient.get(`/api/notifications/by-context?${params}`)
    return response.data
  }

  async findByStatus(status: NotificationStatus, options?: SearchOptions): Promise<Notification[]> {
    const params = new URLSearchParams()
    params.append('status', status)
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.sortBy) params.append('sortBy', options.sortBy)
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder)

    const response = await this.apiClient.get(`/api/notifications/by-status?${params}`)
    return response.data
  }

  async findFailedNotifications(options?: SearchOptions): Promise<Notification[]> {
    return this.findByStatus(NotificationStatus.FAILED, options)
  }

  async findPendingNotifications(): Promise<Notification[]> {
    const response = await this.apiClient.get('/api/notifications/pending')
    return response.data
  }

  async findScheduledNotifications(before?: string): Promise<Notification[]> {
    const params = new URLSearchParams()
    if (before) params.append('before', before)
    
    const response = await this.apiClient.get(`/api/notifications/scheduled?${params}`)
    return response.data
  }

  // ===== ANALYTICS AND REPORTING =====

  async getAnalytics(dateFrom?: string, dateTo?: string): Promise<NotificationAnalytics> {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)

    const response = await this.apiClient.get(`/api/notifications/analytics?${params}`)
    return response.data
  }

  async getDeliveryRates(channel?: NotificationChannel, dateFrom?: string, dateTo?: string): Promise<{
    channel: NotificationChannel
    sent: number
    delivered: number
    failed: number
    deliveryRate: number
  }[]> {
    const params = new URLSearchParams()
    if (channel) params.append('channel', channel)
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)

    const response = await this.apiClient.get(`/api/notifications/delivery-rates?${params}`)
    return response.data
  }

  // ===== BULK OPERATIONS =====

  async markAsDelivered(notificationIds: string[]): Promise<void> {
    await this.apiClient.post('/api/notifications/bulk-delivered', { 
      notificationIds,
      deliveredAt: new Date().toISOString()
    })
  }

  async markAsFailed(notificationIds: string[], error?: string): Promise<void> {
    await this.apiClient.post('/api/notifications/bulk-failed', { 
      notificationIds,
      failedAt: new Date().toISOString(),
      errorMessage: error
    })
  }

  async bulkUpdateStatus(notificationIds: string[], status: NotificationStatus): Promise<void> {
    await this.apiClient.post('/api/notifications/bulk-update-status', {
      notificationIds,
      status,
      timestamp: new Date().toISOString()
    })
  }

  // ===== CLEANUP AND MAINTENANCE =====

  async deleteOldNotifications(olderThanDays: number): Promise<number> {
    const response = await this.apiClient.delete(`/api/notifications/cleanup?olderThanDays=${olderThanDays}`)
    return response.data.deletedCount
  }

  async archiveCompletedNotifications(olderThanDays: number): Promise<number> {
    const response = await this.apiClient.post(`/api/notifications/archive?olderThanDays=${olderThanDays}`)
    return response.data.archivedCount
  }
}

export class NotificationTemplateRepository implements INotificationTemplateRepository {
  constructor(private apiClient: any) {}

  async create(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    const response = await this.apiClient.post('/api/notification-templates', template)
    return response.data
  }

  async findById(id: string): Promise<NotificationTemplate | null> {
    try {
      const response = await this.apiClient.get(`/api/notification-templates/${id}`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  }

  async findMany(ids: string[]): Promise<NotificationTemplate[]> {
    const response = await this.apiClient.post('/api/notification-templates/batch', { ids })
    return response.data
  }

  async update(id: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const response = await this.apiClient.patch(`/api/notification-templates/${id}`, updates)
    return response.data
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/notification-templates/${id}`)
  }

  async findAll(options?: SearchOptions): Promise<PaginatedResult<NotificationTemplate>> {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.sortBy) params.append('sortBy', options.sortBy)
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder)

    const response = await this.apiClient.get(`/api/notification-templates?${params}`)
    return response.data
  }

  async findByType(type: NotificationType): Promise<NotificationTemplate[]> {
    const response = await this.apiClient.get(`/api/notification-templates/by-type/${type}`)
    return response.data
  }

  async findByChannel(channel: NotificationChannel): Promise<NotificationTemplate[]> {
    const response = await this.apiClient.get(`/api/notification-templates/by-channel/${channel}`)
    return response.data
  }

  async findBySlug(slug: string): Promise<NotificationTemplate | null> {
    try {
      const response = await this.apiClient.get(`/api/notification-templates/by-slug/${slug}`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  }

  async findDefault(type: NotificationType, channel: NotificationChannel): Promise<NotificationTemplate | null> {
    try {
      const response = await this.apiClient.get(`/api/notification-templates/default/${type}/${channel}`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  }

  async getActiveTemplates(): Promise<NotificationTemplate[]> {
    const response = await this.apiClient.get('/api/notification-templates/active')
    return response.data
  }
}

export class NotificationProviderRepository implements INotificationProviderRepository {
  constructor(private apiClient: any) {}

  async create(provider: Omit<NotificationProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationProvider> {
    const response = await this.apiClient.post('/api/notification-providers', provider)
    return response.data
  }

  async findById(id: string): Promise<NotificationProvider | null> {
    try {
      const response = await this.apiClient.get(`/api/notification-providers/${id}`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  }

  async findMany(ids: string[]): Promise<NotificationProvider[]> {
    const response = await this.apiClient.post('/api/notification-providers/batch', { ids })
    return response.data
  }

  async update(id: string, updates: Partial<NotificationProvider>): Promise<NotificationProvider> {
    const response = await this.apiClient.patch(`/api/notification-providers/${id}`, updates)
    return response.data
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/notification-providers/${id}`)
  }

  async findAll(options?: SearchOptions): Promise<PaginatedResult<NotificationProvider>> {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.sortBy) params.append('sortBy', options.sortBy)
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder)

    const response = await this.apiClient.get(`/api/notification-providers?${params}`)
    return response.data
  }

  async findByChannel(channel: NotificationChannel): Promise<NotificationProvider[]> {
    const response = await this.apiClient.get(`/api/notification-providers/by-channel/${channel}`)
    return response.data
  }

  async findPrimary(channel: NotificationChannel): Promise<NotificationProvider | null> {
    try {
      const response = await this.apiClient.get(`/api/notification-providers/primary/${channel}`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  }

  async findBySlug(slug: string): Promise<NotificationProvider | null> {
    try {
      const response = await this.apiClient.get(`/api/notification-providers/by-slug/${slug}`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  }

  async getActiveProviders(): Promise<NotificationProvider[]> {
    const response = await this.apiClient.get('/api/notification-providers/active')
    return response.data
  }

  async updateHealthStatus(id: string, isHealthy: boolean, lastCheck?: string): Promise<void> {
    await this.apiClient.patch(`/api/notification-providers/${id}/health`, {
      isHealthy,
      lastHealthCheck: lastCheck || new Date().toISOString()
    })
  }
}

export class NotificationSettingsRepository implements INotificationSettingsRepository {
  constructor(private apiClient: any) {}

  async getSettings(): Promise<NotificationSettings> {
    const response = await this.apiClient.get('/api/settings/notifications')
    return response.data
  }

  async updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const response = await this.apiClient.patch('/api/settings/notifications', settings)
    return response.data
  }

  async getOrderNotificationSettings(): Promise<any> {
    const response = await this.apiClient.get('/api/settings/notifications/order-status')
    return response.data
  }

  async updateOrderNotificationSettings(settings: any): Promise<void> {
    await this.apiClient.post('/api/settings/notifications/order-status', settings)
  }

  async getEventNotificationSettings(): Promise<any> {
    const response = await this.apiClient.get('/api/settings/notifications/event-status')
    return response.data
  }

  async updateEventNotificationSettings(settings: any): Promise<void> {
    await this.apiClient.post('/api/settings/notifications/event-status', settings)
  }
}

export class NotificationLogRepository implements INotificationLogRepository {
  constructor(private apiClient: any) {}

  async create(log: Omit<NotificationLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationLog> {
    const response = await this.apiClient.post('/api/notification-logs', log)
    return response.data
  }

  async findById(id: string): Promise<NotificationLog | null> {
    try {
      const response = await this.apiClient.get(`/api/notification-logs/${id}`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  }

  async findMany(ids: string[]): Promise<NotificationLog[]> {
    const response = await this.apiClient.post('/api/notification-logs/batch', { ids })
    return response.data
  }

  async update(id: string, updates: Partial<NotificationLog>): Promise<NotificationLog> {
    const response = await this.apiClient.patch(`/api/notification-logs/${id}`, updates)
    return response.data
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/notification-logs/${id}`)
  }

  async findAll(options?: SearchOptions): Promise<PaginatedResult<NotificationLog>> {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.sortBy) params.append('sortBy', options.sortBy)
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder)

    const response = await this.apiClient.get(`/api/notification-logs?${params}`)
    return response.data
  }

  async findByNotificationId(notificationId: string): Promise<NotificationLog[]> {
    const response = await this.apiClient.get(`/api/notification-logs/by-notification/${notificationId}`)
    return response.data
  }

  async logEvent(notificationId: string, event: string, details?: string, providerResponse?: Record<string, any>): Promise<NotificationLog> {
    const log: Omit<NotificationLog, 'id' | 'createdAt' | 'updatedAt'> = {
      notificationId,
      event,
      details,
      providerResponse,
      timestamp: new Date().toISOString()
    }
    return this.create(log)
  }
}

export class NotificationBatchRepository implements INotificationBatchRepository {
  constructor(private apiClient: any) {}

  async create(batch: Omit<NotificationBatch, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationBatch> {
    const response = await this.apiClient.post('/api/notification-batches', batch)
    return response.data
  }

  async findById(id: string): Promise<NotificationBatch | null> {
    try {
      const response = await this.apiClient.get(`/api/notification-batches/${id}`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  }

  async findMany(ids: string[]): Promise<NotificationBatch[]> {
    const response = await this.apiClient.post('/api/notification-batches/batch', { ids })
    return response.data
  }

  async update(id: string, updates: Partial<NotificationBatch>): Promise<NotificationBatch> {
    const response = await this.apiClient.patch(`/api/notification-batches/${id}`, updates)
    return response.data
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/notification-batches/${id}`)
  }

  async findAll(options?: SearchOptions): Promise<PaginatedResult<NotificationBatch>> {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.sortBy) params.append('sortBy', options.sortBy)
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder)

    const response = await this.apiClient.get(`/api/notification-batches?${params}`)
    return response.data
  }

  async findByStatus(status: string): Promise<NotificationBatch[]> {
    const response = await this.apiClient.get(`/api/notification-batches/by-status/${status}`)
    return response.data
  }

  async incrementSent(id: string): Promise<void> {
    await this.apiClient.post(`/api/notification-batches/${id}/increment-sent`)
  }

  async incrementDelivered(id: string): Promise<void> {
    await this.apiClient.post(`/api/notification-batches/${id}/increment-delivered`)
  }

  async incrementFailed(id: string): Promise<void> {
    await this.apiClient.post(`/api/notification-batches/${id}/increment-failed`)
  }

  async updateStatus(id: string, status: string, completedAt?: string): Promise<void> {
    await this.apiClient.patch(`/api/notification-batches/${id}/status`, {
      status,
      completedAt
    })
  }
}