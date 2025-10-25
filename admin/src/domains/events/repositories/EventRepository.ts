/**
 * Event Repository
 * Data access layer for event management
 */

import { BaseRepository } from '@shared/infrastructure/database/BaseRepository'
import { PaginatedResult, QueryFilter } from '@shared/types/common'
import { ApiService } from '@shared/infrastructure/api/ApiService'
import {
  Event,
  EventItem,
  EventPayment,
  EventQuote,
  EventInstallation,
  EventSearchFilters,
  EventSearchResult,
  EventAnalytics,
  EventStatus,
  EventType,
  EventPaymentStatus
} from '../entities/Event'

export class EventRepository extends BaseRepository<Event> {
  protected endpoint = '/api/events'
  protected entityName = 'event'

  // ===== EVENT CRUD OPERATIONS =====

  async findByNumber(eventNumber: number): Promise<Event | null> {
    try {
      const response = await ApiService.get<Event>(`${this.endpoint}/number/${eventNumber}`)
      return response.success ? response.data : null
    } catch (error) {
      console.error('Failed to find event by number:', error)
      return null
    }
  }

  async search(filters: EventSearchFilters): Promise<EventSearchResult> {
    try {
      const params = new URLSearchParams()
      
      if (filters.query) params.append('search', filters.query)
      if (filters.status) params.append('status', filters.status)
      if (filters.eventType) params.append('type', filters.eventType)
      if (filters.customerId) params.append('customerId', filters.customerId)
      if (filters.employeeId) params.append('employeeId', filters.employeeId)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.venueSearch) params.append('venue', filters.venueSearch)
      if (filters.hasOutstandingBalance) params.append('hasOutstandingBalance', 'true')
      
      params.append('limit', '50')

      const response = await ApiService.get<{ events: Event[]; total: number }>(`${this.endpoint}/search?${params}`)
      
      if (response.success) {
        return {
          events: response.data.events,
          total: response.data.total,
          filters
        }
      }
      
      return { events: [], total: 0, filters }
    } catch (error) {
      console.error('Failed to search events:', error)
      return { events: [], total: 0, filters }
    }
  }

  async findByCustomer(customerId: string): Promise<Event[]> {
    try {
      const response = await ApiService.get<Event[]>(`${this.endpoint}/customer/${customerId}`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to find events by customer:', error)
      return []
    }
  }

  async findByEmployee(employeeId: string): Promise<Event[]> {
    try {
      const response = await ApiService.get<Event[]>(`${this.endpoint}/employee/${employeeId}`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to find events by employee:', error)
      return []
    }
  }

  async findByDateRange(dateFrom: string, dateTo: string): Promise<Event[]> {
    try {
      const params = new URLSearchParams({
        dateFrom,
        dateTo
      })
      const response = await ApiService.get<Event[]>(`${this.endpoint}/date-range?${params}`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to find events by date range:', error)
      return []
    }
  }

  async findUpcoming(days: number = 30): Promise<Event[]> {
    try {
      const response = await ApiService.get<Event[]>(`${this.endpoint}/upcoming?days=${days}`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to find upcoming events:', error)
      return []
    }
  }

  async findOverdue(): Promise<Event[]> {
    try {
      const response = await ApiService.get<Event[]>(`${this.endpoint}/overdue`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to find overdue events:', error)
      return []
    }
  }

  async updateStatus(eventId: string, status: EventStatus, notes?: string): Promise<Event | null> {
    try {
      const response = await ApiService.patch<Event>(`${this.endpoint}/${eventId}/status`, {
        status,
        notes
      })
      return response.success ? response.data : null
    } catch (error) {
      console.error('Failed to update event status:', error)
      return null
    }
  }

  // ===== EVENT ITEMS MANAGEMENT =====

  async getEventItems(eventId: string): Promise<EventItem[]> {
    try {
      const response = await ApiService.get<EventItem[]>(`${this.endpoint}/${eventId}/items`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to get event items:', error)
      return []
    }
  }

  async addEventItem(eventId: string, itemData: Omit<EventItem, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): Promise<EventItem | null> {
    try {
      const response = await ApiService.post<EventItem>(`${this.endpoint}/${eventId}/items`, itemData)
      return response.success ? response.data : null
    } catch (error) {
      console.error('Failed to add event item:', error)
      return null
    }
  }

  async updateEventItem(eventId: string, itemId: string, updates: Partial<EventItem>): Promise<EventItem | null> {
    try {
      const response = await ApiService.patch<EventItem>(`${this.endpoint}/${eventId}/items/${itemId}`, updates)
      return response.success ? response.data : null
    } catch (error) {
      console.error('Failed to update event item:', error)
      return null
    }
  }

  async deleteEventItem(eventId: string, itemId: string): Promise<boolean> {
    try {
      const response = await ApiService.delete(`${this.endpoint}/${eventId}/items/${itemId}`)
      return response.success
    } catch (error) {
      console.error('Failed to delete event item:', error)
      return false
    }
  }

  async markItemCompleted(eventId: string, itemId: string): Promise<EventItem | null> {
    try {
      const response = await ApiService.patch<EventItem>(`${this.endpoint}/${eventId}/items/${itemId}/complete`, {
        isCompleted: true,
        completedAt: new Date().toISOString()
      })
      return response.success ? response.data : null
    } catch (error) {
      console.error('Failed to mark item completed:', error)
      return null
    }
  }

  // ===== EVENT PAYMENTS MANAGEMENT =====

  async getEventPayments(eventId: string): Promise<EventPayment[]> {
    try {
      const response = await ApiService.get<EventPayment[]>(`${this.endpoint}/${eventId}/payments`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to get event payments:', error)
      return []
    }
  }

  async addEventPayment(paymentData: Omit<EventPayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<EventPayment | null> {
    try {
      const response = await ApiService.post<EventPayment>(`${this.endpoint}/${paymentData.eventId}/payments`, paymentData)
      return response.success ? response.data : null
    } catch (error) {
      console.error('Failed to add event payment:', error)
      return null
    }
  }

  async updateEventPayment(eventId: string, paymentId: string, updates: Partial<EventPayment>): Promise<EventPayment | null> {
    try {
      const response = await ApiService.patch<EventPayment>(`${this.endpoint}/${eventId}/payments/${paymentId}`, updates)
      return response.success ? response.data : null
    } catch (error) {
      console.error('Failed to update event payment:', error)
      return null
    }
  }

  async deleteEventPayment(eventId: string, paymentId: string): Promise<boolean> {
    try {
      const response = await ApiService.delete(`${this.endpoint}/${eventId}/payments/${paymentId}`)
      return response.success
    } catch (error) {
      console.error('Failed to delete event payment:', error)
      return false
    }
  }

  // ===== QUOTES MANAGEMENT =====

  async getEventQuotes(eventId: string): Promise<EventQuote[]> {
    try {
      const response = await ApiService.get<EventQuote[]>(`${this.endpoint}/${eventId}/quotes`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to get event quotes:', error)
      return []
    }
  }

  async createQuote(quoteData: Omit<EventQuote, 'id' | 'createdAt' | 'updatedAt'>): Promise<EventQuote | null> {
    try {
      const response = await ApiService.post<EventQuote>(`${this.endpoint}/${quoteData.eventId}/quotes`, quoteData)
      return response.success ? response.data : null
    } catch (error) {
      console.error('Failed to create quote:', error)
      return null
    }
  }

  async sendQuote(eventId: string, quoteId: string): Promise<boolean> {
    try {
      const response = await ApiService.post(`${this.endpoint}/${eventId}/quotes/${quoteId}/send`, {
        sentAt: new Date().toISOString()
      })
      return response.success
    } catch (error) {
      console.error('Failed to send quote:', error)
      return false
    }
  }

  async approveQuote(eventId: string, quoteId: string): Promise<boolean> {
    try {
      const response = await ApiService.post(`${this.endpoint}/${eventId}/quotes/${quoteId}/approve`, {
        approvedAt: new Date().toISOString()
      })
      return response.success
    } catch (error) {
      console.error('Failed to approve quote:', error)
      return false
    }
  }

  // ===== INSTALLATIONS MANAGEMENT =====

  async getEventInstallations(eventId: string): Promise<EventInstallation[]> {
    try {
      const response = await ApiService.get<EventInstallation[]>(`${this.endpoint}/${eventId}/installations`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to get event installations:', error)
      return []
    }
  }

  async scheduleInstallation(installationData: Omit<EventInstallation, 'id' | 'createdAt' | 'updatedAt'>): Promise<EventInstallation | null> {
    try {
      const response = await ApiService.post<EventInstallation>(`${this.endpoint}/${installationData.eventId}/installations`, installationData)
      return response.success ? response.data : null
    } catch (error) {
      console.error('Failed to schedule installation:', error)
      return null
    }
  }

  async updateInstallation(eventId: string, installationId: string, updates: Partial<EventInstallation>): Promise<EventInstallation | null> {
    try {
      const response = await ApiService.patch<EventInstallation>(`${this.endpoint}/${eventId}/installations/${installationId}`, updates)
      return response.success ? response.data : null
    } catch (error) {
      console.error('Failed to update installation:', error)
      return null
    }
  }

  // ===== ANALYTICS =====

  async getEventAnalytics(dateFrom: Date, dateTo: Date): Promise<EventAnalytics | null> {
    try {
      const params = new URLSearchParams({
        dateFrom: dateFrom.toISOString().split('T')[0],
        dateTo: dateTo.toISOString().split('T')[0]
      })
      
      const response = await ApiService.get<EventAnalytics>(`${this.endpoint}/analytics?${params}`)
      return response.success ? response.data : null
    } catch (error) {
      console.error('Failed to get event analytics:', error)
      return null
    }
  }

  async getRevenueByMonth(year: number): Promise<Array<{ month: string; revenue: number; eventCount: number }>> {
    try {
      const response = await ApiService.get<Array<{ month: string; revenue: number; eventCount: number }>>(`${this.endpoint}/analytics/revenue-by-month?year=${year}`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to get revenue by month:', error)
      return []
    }
  }

  async getTopVenues(limit: number = 10): Promise<Array<{ venue: string; eventCount: number; totalRevenue: number }>> {
    try {
      const response = await ApiService.get<Array<{ venue: string; eventCount: number; totalRevenue: number }>>(`${this.endpoint}/analytics/top-venues?limit=${limit}`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to get top venues:', error)
      return []
    }
  }

  async getStaffPerformance(): Promise<Array<{ employeeId: string; employeeName: string; eventCount: number; totalRevenue: number }>> {
    try {
      const response = await ApiService.get<Array<{ employeeId: string; employeeName: string; eventCount: number; totalRevenue: number }>>(`${this.endpoint}/analytics/staff-performance`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to get staff performance:', error)
      return []
    }
  }

  // ===== UTILITY METHODS =====

  async getNextEventNumber(): Promise<number> {
    try {
      const response = await ApiService.get<{ nextNumber: number }>(`${this.endpoint}/next-number`)
      return response.success ? response.data.nextNumber : Date.now() % 1000000
    } catch (error) {
      console.error('Failed to get next event number:', error)
      return Date.now() % 1000000
    }
  }

  async searchVenues(query: string): Promise<string[]> {
    try {
      const response = await ApiService.get<string[]>(`${this.endpoint}/venues/search?q=${encodeURIComponent(query)}`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to search venues:', error)
      return []
    }
  }

  async getEventStatusHistory(eventId: string): Promise<Array<{ status: EventStatus; changedAt: string; notes?: string; employeeName?: string }>> {
    try {
      const response = await ApiService.get<Array<{ status: EventStatus; changedAt: string; notes?: string; employeeName?: string }>>(`${this.endpoint}/${eventId}/status-history`)
      return response.success ? response.data : []
    } catch (error) {
      console.error('Failed to get event status history:', error)
      return []
    }
  }

  // ===== BULK OPERATIONS =====

  async bulkUpdateStatus(eventIds: string[], status: EventStatus, notes?: string): Promise<boolean> {
    try {
      const response = await ApiService.patch(`${this.endpoint}/bulk/status`, {
        eventIds,
        status,
        notes
      })
      return response.success
    } catch (error) {
      console.error('Failed to bulk update status:', error)
      return false
    }
  }

  async exportEvents(filters: EventSearchFilters, format: 'csv' | 'excel' = 'csv'): Promise<Blob | null> {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.eventType) params.append('type', filters.eventType)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      params.append('format', format)

      const response = await fetch(`${this.endpoint}/export?${params}`)
      if (response.ok) {
        return await response.blob()
      }
      return null
    } catch (error) {
      console.error('Failed to export events:', error)
      return null
    }
  }
}