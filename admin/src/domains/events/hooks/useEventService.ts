/**
 * React Hooks for Event Service
 * Clean interface for event management components
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { EventService } from '../services/EventService'
import { EventRepository } from '../repositories/EventRepository'
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
  CreateEventRequest,
  CreateEventItemRequest,
  CreateEventPaymentRequest,
  CreateQuoteRequest,
  UpdateEventStatusRequest
} from '../entities/Event'

// Create singleton instances
const eventRepository = new EventRepository()
const eventService = new EventService(eventRepository)

// ===== MAIN EVENT SERVICE HOOK =====

export const useEventService = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Clear error helper
  const clearError = useCallback(() => setError(null), [])
  
  return {
    // State
    loading,
    error,
    clearError,
    
    // Direct service access
    eventService,
    eventRepository
  }
}

// ===== EVENT SEARCH HOOK =====

export const useEventSearch = () => {
  const { eventService } = useEventService()
  const [searchResult, setSearchResult] = useState<EventSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchFilters, setSearchFilters] = useState<EventSearchFilters>({})

  // Debounced search function
  const searchEvents = useCallback(async (filters: EventSearchFilters) => {
    setLoading(true)
    setSearchFilters(filters)
    
    try {
      const result = await eventService.searchEvents(filters)
      setSearchResult(result)
    } catch (error) {
      console.error('Event search error:', error)
      setSearchResult({
        events: [],
        total: 0,
        filters
      })
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Quick search by query string
  const quickSearch = useCallback((query: string) => {
    searchEvents({ ...searchFilters, query })
  }, [searchEvents, searchFilters])

  // Filter by status
  const filterByStatus = useCallback((status: EventStatus) => {
    searchEvents({ ...searchFilters, status })
  }, [searchEvents, searchFilters])

  // Filter by type
  const filterByType = useCallback((eventType: EventType) => {
    searchEvents({ ...searchFilters, eventType })
  }, [searchEvents, searchFilters])

  // Filter by customer
  const filterByCustomer = useCallback((customerId: string) => {
    searchEvents({ ...searchFilters, customerId })
  }, [searchEvents, searchFilters])

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchFilters({})
    setSearchResult(null)
  }, [])

  return {
    // State
    searchResult,
    loading,
    searchFilters,
    
    // Operations
    searchEvents,
    quickSearch,
    filterByStatus,
    filterByType,
    filterByCustomer,
    clearSearch
  }
}

// ===== EVENT LIST HOOK (Drop-in replacement for EventsListPage) =====

export const useEventsList = () => {
  const { eventService } = useEventService()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<EventType | 'ALL'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)

  // Load events with filters
  const fetchEvents = useCallback(async () => {
    if (events.length === 0) {
      setLoading(true)
    } else {
      setSearching(true)
    }
    setError(null)
    
    try {
      const filters: EventSearchFilters = {}
      
      if (statusFilter !== 'ALL') filters.status = statusFilter as EventStatus
      if (typeFilter !== 'ALL') filters.eventType = typeFilter as EventType
      if (searchTerm) filters.query = searchTerm
      
      const result = await eventService.searchEvents(filters)
      setEvents(result.events)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load events'
      setError(message)
      console.error('Failed to fetch events:', err)
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }, [eventService, statusFilter, typeFilter, searchTerm, events.length])

  // Update filters
  const updateStatusFilter = useCallback((status: EventStatus | 'ALL') => {
    setStatusFilter(status)
  }, [])

  const updateTypeFilter = useCallback((type: EventType | 'ALL') => {
    setTypeFilter(type)
  }, [])

  const updateSearchTerm = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  // Refresh events
  const refetch = useCallback(() => {
    fetchEvents()
  }, [fetchEvents])

  // Load events when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents()
    }, searchTerm ? 300 : 0) // Debounce search, immediate filter

    return () => clearTimeout(timer)
  }, [fetchEvents])

  return {
    // State (compatible with EventsListPage)
    events,
    loading,
    searching,
    error,
    statusFilter,
    typeFilter,
    searchTerm,
    
    // Operations (compatible with EventsListPage)
    fetchEvents,
    refetch,
    updateStatusFilter,
    updateTypeFilter,
    updateSearchTerm
  }
}

// ===== EVENT MANAGEMENT HOOK =====

export const useEventManagement = () => {
  const { eventService } = useEventService()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load event by ID
  const loadEvent = useCallback(async (eventId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const event = await eventService.findById(eventId)
      setSelectedEvent(event)
      return event
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load event'
      setError(message)
      console.error('Failed to load event:', error)
      setSelectedEvent(null)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Create new event
  const createEvent = useCallback(async (eventData: CreateEventRequest) => {
    setLoading(true)
    setError(null)
    
    try {
      const newEvent = await eventService.create(eventData)
      setSelectedEvent(newEvent)
      return newEvent
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create event'
      setError(message)
      console.error('Failed to create event:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Update event
  const updateEvent = useCallback(async (eventId: string, updates: Partial<Event>) => {
    setLoading(true)
    setError(null)
    
    try {
      const updatedEvent = await eventService.update(eventId, updates)
      setSelectedEvent(updatedEvent)
      return updatedEvent
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update event'
      setError(message)
      console.error('Failed to update event:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Update event status
  const updateEventStatus = useCallback(async (eventId: string, statusRequest: UpdateEventStatusRequest) => {
    setLoading(true)
    setError(null)
    
    try {
      const updatedEvent = await eventService.updateEventStatus(eventId, statusRequest)
      setSelectedEvent(updatedEvent)
      return updatedEvent
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update event status'
      setError(message)
      console.error('Failed to update event status:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Delete event
  const deleteEvent = useCallback(async (eventId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      await eventService.delete(eventId)
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete event'
      setError(message)
      console.error('Failed to delete event:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService, selectedEvent])

  return {
    // State
    selectedEvent,
    loading,
    error,
    
    // Operations
    loadEvent,
    createEvent,
    updateEvent,
    updateEventStatus,
    deleteEvent,
    setSelectedEvent
  }
}

// ===== EVENT ITEMS HOOK =====

export const useEventItems = () => {
  const { eventService } = useEventService()
  const [items, setItems] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)

  // Load items for event
  const loadItems = useCallback(async (eventId: string) => {
    setLoading(true)
    
    try {
      const data = await eventService.getEventItems(eventId)
      setItems(data)
      return data
    } catch (error) {
      console.error('Failed to load event items:', error)
      setItems([])
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Add item
  const addItem = useCallback(async (eventId: string, itemData: CreateEventItemRequest) => {
    setLoading(true)
    
    try {
      const newItem = await eventService.addEventItem(eventId, itemData)
      setItems(prev => [...prev, newItem].sort((a, b) => a.sortOrder - b.sortOrder))
      return newItem
    } catch (error) {
      console.error('Failed to add event item:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Update item
  const updateItem = useCallback(async (eventId: string, itemId: string, updates: Partial<EventItem>) => {
    setLoading(true)
    
    try {
      const updatedItem = await eventService.updateEventItem(eventId, itemId, updates)
      setItems(prev => prev.map(item => item.id === itemId ? updatedItem : item))
      return updatedItem
    } catch (error) {
      console.error('Failed to update event item:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Delete item
  const deleteItem = useCallback(async (eventId: string, itemId: string) => {
    setLoading(true)
    
    try {
      await eventService.deleteEventItem(eventId, itemId)
      setItems(prev => prev.filter(item => item.id !== itemId))
    } catch (error) {
      console.error('Failed to delete event item:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Mark item completed
  const markItemCompleted = useCallback(async (eventId: string, itemId: string) => {
    setLoading(true)
    
    try {
      const updatedItem = await eventService.markEventItemCompleted(eventId, itemId)
      setItems(prev => prev.map(item => item.id === itemId ? updatedItem : item))
      return updatedItem
    } catch (error) {
      console.error('Failed to mark item completed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Calculate total
  const total = useMemo(() => 
    items.reduce((sum, item) => sum + item.totalPrice, 0), [items]
  )

  return {
    // State
    items,
    loading,
    total,
    
    // Operations
    loadItems,
    addItem,
    updateItem,
    deleteItem,
    markItemCompleted
  }
}

// ===== EVENT PAYMENTS HOOK =====

export const useEventPayments = () => {
  const { eventService } = useEventService()
  const [payments, setPayments] = useState<EventPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [paymentSummary, setPaymentSummary] = useState({ received: 0, pending: 0, total: 0, remaining: 0 })

  // Load payments for event
  const loadPayments = useCallback(async (eventId: string) => {
    setLoading(true)
    
    try {
      const [paymentsData, summary] = await Promise.all([
        eventService.getEventPayments(eventId),
        eventService.calculatePaymentSummary(eventId)
      ])
      
      setPayments(paymentsData)
      setPaymentSummary(summary)
      return paymentsData
    } catch (error) {
      console.error('Failed to load event payments:', error)
      setPayments([])
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Add payment
  const addPayment = useCallback(async (paymentData: CreateEventPaymentRequest) => {
    setLoading(true)
    
    try {
      const newPayment = await eventService.addEventPayment(paymentData)
      setPayments(prev => [newPayment, ...prev])
      
      // Reload payment summary
      const summary = await eventService.calculatePaymentSummary(paymentData.eventId)
      setPaymentSummary(summary)
      
      return newPayment
    } catch (error) {
      console.error('Failed to add event payment:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Update payment
  const updatePayment = useCallback(async (eventId: string, paymentId: string, updates: Partial<EventPayment>) => {
    setLoading(true)
    
    try {
      const updatedPayment = await eventService.updateEventPayment(eventId, paymentId, updates)
      setPayments(prev => prev.map(payment => payment.id === paymentId ? updatedPayment : payment))
      
      // Reload payment summary
      const summary = await eventService.calculatePaymentSummary(eventId)
      setPaymentSummary(summary)
      
      return updatedPayment
    } catch (error) {
      console.error('Failed to update event payment:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Delete payment
  const deletePayment = useCallback(async (eventId: string, paymentId: string) => {
    setLoading(true)
    
    try {
      await eventService.deleteEventPayment(eventId, paymentId)
      setPayments(prev => prev.filter(payment => payment.id !== paymentId))
      
      // Reload payment summary
      const summary = await eventService.calculatePaymentSummary(eventId)
      setPaymentSummary(summary)
    } catch (error) {
      console.error('Failed to delete event payment:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  return {
    // State
    payments,
    paymentSummary,
    loading,
    
    // Operations
    loadPayments,
    addPayment,
    updatePayment,
    deletePayment
  }
}

// ===== EVENT ANALYTICS HOOK =====

export const useEventAnalytics = () => {
  const { eventService } = useEventService()
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null)
  const [loading, setLoading] = useState(false)

  // Load analytics
  const loadAnalytics = useCallback(async (dateFrom: Date, dateTo: Date) => {
    setLoading(true)
    
    try {
      const data = await eventService.getEventAnalytics(dateFrom, dateTo)
      setAnalytics(data)
      return data
    } catch (error) {
      console.error('Failed to load event analytics:', error)
      setAnalytics(null)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Get monthly revenue
  const getMonthlyRevenue = useCallback(async (year: number = new Date().getFullYear()) => {
    try {
      return await eventService.getMonthlyRevenue(year)
    } catch (error) {
      console.error('Failed to get monthly revenue:', error)
      throw error
    }
  }, [eventService])

  // Get top venues
  const getTopVenues = useCallback(async (limit: number = 10) => {
    try {
      return await eventService.getTopVenues(limit)
    } catch (error) {
      console.error('Failed to get top venues:', error)
      throw error
    }
  }, [eventService])

  // Get staff performance
  const getStaffPerformance = useCallback(async () => {
    try {
      return await eventService.getStaffPerformance()
    } catch (error) {
      console.error('Failed to get staff performance:', error)
      throw error
    }
  }, [eventService])

  return {
    // State
    analytics,
    loading,
    
    // Operations
    loadAnalytics,
    getMonthlyRevenue,
    getTopVenues,
    getStaffPerformance
  }
}

// ===== EVENT DASHBOARD HOOK =====

export const useEventDashboard = () => {
  const { eventService } = useEventService()
  const [dashboardData, setDashboardData] = useState<{
    upcomingEvents: Event[]
    overdueEvents: Event[]
    recentPayments: EventPayment[]
    productionItems: EventItem[]
    pendingQuotes: Event[]
  } | null>(null)
  const [loading, setLoading] = useState(false)

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    setLoading(true)
    
    try {
      const data = await eventService.getDashboardSummary()
      setDashboardData(data)
      return data
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setDashboardData(null)
      throw error
    } finally {
      setLoading(false)
    }
  }, [eventService])

  // Initial load
  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  return {
    // State
    dashboardData,
    loading,
    
    // Operations
    loadDashboard,
    refresh: loadDashboard
  }
}