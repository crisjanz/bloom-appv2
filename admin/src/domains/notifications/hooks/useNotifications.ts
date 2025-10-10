/**
 * Notification Hooks
 * React hooks for notification operations
 */

import { useState, useEffect, useCallback } from 'react'
import { 
  Notification, 
  NotificationTemplate, 
  NotificationProvider,
  NotificationSettings,
  NotificationSearchFilters,
  NotificationSearchResult,
  NotificationAnalytics,
  SendNotificationRequest,
  BulkNotificationRequest,
  NotificationResponse,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  RecipientType
} from '../entities/Notification'
import { 
  NotificationRepository,
  NotificationTemplateRepository,
  NotificationProviderRepository,
  NotificationSettingsRepository
} from '../repositories/NotificationRepository'
import { NotificationService } from '../services/NotificationService'
import { useApiClient } from '@shared/hooks/useApiClient'
import { SearchOptions, PaginatedResult } from '@shared/types/common'

// ===== MAIN NOTIFICATIONS HOOK =====

export function useNotifications(filters?: NotificationSearchFilters, options?: SearchOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [searchResult, setSearchResult] = useState<NotificationSearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const apiClient = useApiClient()
  const repository = new NotificationRepository(apiClient)

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (filters && Object.keys(filters).length > 0) {
        // Search with filters
        const result = await repository.search(filters, options)
        setSearchResult(result)
        setNotifications(result.notifications)
      } else {
        // Get all notifications
        const result = await repository.findAll(options)
        setNotifications(result.data)
        setSearchResult({
          notifications: result.data,
          total: result.total,
          filters: {}
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setIsLoading(false)
    }
  }, [filters, options, repository])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const refresh = useCallback(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    searchResult,
    isLoading,
    error,
    refresh
  }
}

// ===== SEND NOTIFICATION HOOK =====

export function useSendNotification() {
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResponse, setLastResponse] = useState<NotificationResponse | null>(null)

  const apiClient = useApiClient()
  const notificationRepository = new NotificationRepository(apiClient)
  const templateRepository = new NotificationTemplateRepository(apiClient)
  const settingsRepository = new NotificationSettingsRepository(apiClient)
  
  const notificationService = new NotificationService(
    notificationRepository,
    templateRepository,
    settingsRepository
  )

  const sendNotification = useCallback(async (request: SendNotificationRequest): Promise<NotificationResponse> => {
    try {
      setIsSending(true)
      setError(null)

      const response = await notificationService.sendNotification(request)
      setLastResponse(response)
      
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send notification'
      setError(errorMessage)
      const errorResponse: NotificationResponse = {
        success: false,
        error: errorMessage
      }
      setLastResponse(errorResponse)
      return errorResponse
    } finally {
      setIsSending(false)
    }
  }, [notificationService])

  const sendBulkNotifications = useCallback(async (request: BulkNotificationRequest) => {
    try {
      setIsSending(true)
      setError(null)

      const response = await notificationService.sendBulkNotifications(request)
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send bulk notifications'
      setError(errorMessage)
      throw err
    } finally {
      setIsSending(false)
    }
  }, [notificationService])

  return {
    sendNotification,
    sendBulkNotifications,
    isSending,
    error,
    lastResponse,
    clearError: () => setError(null)
  }
}

// ===== NOTIFICATION TEMPLATES HOOK =====

export function useNotificationTemplates(type?: NotificationType, channel?: NotificationChannel) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apiClient = useApiClient()
  const repository = new NotificationTemplateRepository(apiClient)

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      let result: NotificationTemplate[]

      if (type && channel) {
        // Find default template for specific type and channel
        const defaultTemplate = await repository.findDefault(type, channel)
        result = defaultTemplate ? [defaultTemplate] : []
      } else if (type) {
        result = await repository.findByType(type)
      } else if (channel) {
        result = await repository.findByChannel(channel)
      } else {
        const paginatedResult = await repository.findAll()
        result = paginatedResult.data
      }

      setTemplates(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates')
    } finally {
      setIsLoading(false)
    }
  }, [type, channel, repository])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const createTemplate = useCallback(async (template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTemplate = await repository.create(template)
      setTemplates(prev => [...prev, newTemplate])
      return newTemplate
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
      throw err
    }
  }, [repository])

  const updateTemplate = useCallback(async (id: string, updates: Partial<NotificationTemplate>) => {
    try {
      const updatedTemplate = await repository.update(id, updates)
      setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t))
      return updatedTemplate
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template')
      throw err
    }
  }, [repository])

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await repository.delete(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
      throw err
    }
  }, [repository])

  const refresh = useCallback(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refresh
  }
}

// ===== NOTIFICATION SETTINGS HOOK =====

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiClient = useApiClient()
  const repository = new NotificationSettingsRepository(apiClient)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await repository.getSettings()
      setSettings(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
    } finally {
      setIsLoading(false)
    }
  }, [repository])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSettings = useCallback(async (updates: Partial<NotificationSettings>) => {
    try {
      setIsSaving(true)
      setError(null)
      const updatedSettings = await repository.updateSettings(updates)
      setSettings(updatedSettings)
      return updatedSettings
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [repository])

  const updateOrderNotificationSettings = useCallback(async (orderSettings: any) => {
    try {
      setIsSaving(true)
      setError(null)
      await repository.updateOrderNotificationSettings(orderSettings)
      await fetchSettings() // Refresh all settings
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order notification settings')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [repository, fetchSettings])

  const updateEventNotificationSettings = useCallback(async (eventSettings: any) => {
    try {
      setIsSaving(true)
      setError(null)
      await repository.updateEventNotificationSettings(eventSettings)
      await fetchSettings() // Refresh all settings
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event notification settings')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [repository, fetchSettings])

  return {
    settings,
    isLoading,
    isSaving,
    error,
    updateSettings,
    updateOrderNotificationSettings,
    updateEventNotificationSettings,
    refresh: fetchSettings
  }
}

// ===== NOTIFICATION ANALYTICS HOOK =====

export function useNotificationAnalytics(dateFrom?: string, dateTo?: string) {
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apiClient = useApiClient()
  const repository = new NotificationRepository(apiClient)

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await repository.getAnalytics(dateFrom, dateTo)
      setAnalytics(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setIsLoading(false)
    }
  }, [dateFrom, dateTo, repository])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const refresh = useCallback(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    analytics,
    isLoading,
    error,
    refresh
  }
}

// ===== INDIVIDUAL NOTIFICATION HOOK =====

export function useNotification(id: string) {
  const [notification, setNotification] = useState<Notification | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apiClient = useApiClient()
  const repository = new NotificationRepository(apiClient)

  const fetchNotification = useCallback(async () => {
    if (!id) return

    try {
      setIsLoading(true)
      setError(null)
      const result = await repository.findById(id)
      setNotification(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notification')
    } finally {
      setIsLoading(false)
    }
  }, [id, repository])

  useEffect(() => {
    fetchNotification()
  }, [fetchNotification])

  const updateNotification = useCallback(async (updates: Partial<Notification>) => {
    if (!id) return

    try {
      const updated = await repository.update(id, updates)
      setNotification(updated)
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification')
      throw err
    }
  }, [id, repository])

  const deleteNotification = useCallback(async () => {
    if (!id) return

    try {
      await repository.delete(id)
      setNotification(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification')
      throw err
    }
  }, [id, repository])

  const refresh = useCallback(() => {
    fetchNotification()
  }, [fetchNotification])

  return {
    notification,
    isLoading,
    error,
    updateNotification,
    deleteNotification,
    refresh
  }
}

// ===== RECIPIENT NOTIFICATIONS HOOK =====

export function useRecipientNotifications(recipientType: RecipientType, recipientId: string, options?: SearchOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apiClient = useApiClient()
  const repository = new NotificationRepository(apiClient)

  const fetchNotifications = useCallback(async () => {
    if (!recipientType || !recipientId) return

    try {
      setIsLoading(true)
      setError(null)
      const result = await repository.findByRecipient(recipientType, recipientId, options)
      setNotifications(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setIsLoading(false)
    }
  }, [recipientType, recipientId, options, repository])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const refresh = useCallback(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    isLoading,
    error,
    refresh
  }
}

// ===== CONTEXT NOTIFICATIONS HOOK =====

export function useContextNotifications(contextType: string, contextId: string, options?: SearchOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apiClient = useApiClient()
  const repository = new NotificationRepository(apiClient)

  const fetchNotifications = useCallback(async () => {
    if (!contextType || !contextId) return

    try {
      setIsLoading(true)
      setError(null)
      const result = await repository.findByContext(contextType, contextId, options)
      setNotifications(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setIsLoading(false)
    }
  }, [contextType, contextId, options, repository])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const refresh = useCallback(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    isLoading,
    error,
    refresh
  }
}

// ===== QUICK NOTIFICATION HELPERS =====

export function useQuickNotification() {
  const { sendNotification, isSending, error } = useSendNotification()

  // Send quick email notification
  const sendEmail = useCallback(async (
    email: string,
    subject: string,
    message: string,
    recipientType: RecipientType = RecipientType.CUSTOMER,
    type: NotificationType = NotificationType.SYSTEM_ALERT
  ) => {
    return sendNotification({
      type,
      channel: NotificationChannel.EMAIL,
      recipientType,
      recipientEmail: email,
      subject,
      message
    })
  }, [sendNotification])

  // Send quick SMS notification
  const sendSMS = useCallback(async (
    phone: string,
    message: string,
    recipientType: RecipientType = RecipientType.CUSTOMER,
    type: NotificationType = NotificationType.SYSTEM_ALERT
  ) => {
    return sendNotification({
      type,
      channel: NotificationChannel.SMS,
      recipientType,
      recipientPhone: phone,
      message
    })
  }, [sendNotification])

  // Send order status notification
  const sendOrderNotification = useCallback(async (
    orderId: string,
    status: string,
    customerEmail?: string,
    customerPhone?: string,
    recipientEmail?: string,
    recipientPhone?: string
  ) => {
    const notifications: Promise<NotificationResponse>[] = []

    if (customerEmail) {
      notifications.push(sendNotification({
        type: NotificationType.ORDER_STATUS_UPDATE,
        channel: NotificationChannel.EMAIL,
        recipientType: RecipientType.CUSTOMER,
        recipientEmail: customerEmail,
        contextType: 'order',
        contextId: orderId,
        templateData: { orderStatus: status }
      }))
    }

    if (customerPhone) {
      notifications.push(sendNotification({
        type: NotificationType.ORDER_STATUS_UPDATE,
        channel: NotificationChannel.SMS,
        recipientType: RecipientType.CUSTOMER,
        recipientPhone: customerPhone,
        contextType: 'order',
        contextId: orderId,
        templateData: { orderStatus: status }
      }))
    }

    if (recipientEmail) {
      notifications.push(sendNotification({
        type: NotificationType.ORDER_STATUS_UPDATE,
        channel: NotificationChannel.EMAIL,
        recipientType: RecipientType.RECIPIENT,
        recipientEmail: recipientEmail,
        contextType: 'order',
        contextId: orderId,
        templateData: { orderStatus: status }
      }))
    }

    if (recipientPhone) {
      notifications.push(sendNotification({
        type: NotificationType.ORDER_STATUS_UPDATE,
        channel: NotificationChannel.SMS,
        recipientType: RecipientType.RECIPIENT,
        recipientPhone: recipientPhone,
        contextType: 'order',
        contextId: orderId,
        templateData: { orderStatus: status }
      }))
    }

    return Promise.all(notifications)
  }, [sendNotification])

  return {
    sendEmail,
    sendSMS,
    sendOrderNotification,
    isSending,
    error
  }
}