/**
 * Event Service
 * Business logic for wedding and event management
 */

import { DomainService } from '@shared/types/common'
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
  EventPaymentStatus,
  CreateEventRequest,
  CreateEventItemRequest,
  CreateEventPaymentRequest,
  CreateQuoteRequest,
  UpdateEventStatusRequest,
  EventHelper,
  InstallationStatus
} from '../entities/Event'

export class EventService implements DomainService<Event> {
  constructor(private eventRepository: EventRepository) {}

  // ===== BASIC CRUD OPERATIONS =====

  async create(eventData: CreateEventRequest): Promise<Event> {
    // Generate event number
    const eventNumber = await this.eventRepository.getNextEventNumber()
    
    // Prepare event data
    const event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
      eventNumber,
      eventType: eventData.eventType,
      eventName: eventData.eventName,
      description: eventData.description,
      status: EventStatus.INQUIRY,
      customerId: eventData.customerId,
      eventDate: eventData.eventDate,
      setupDate: eventData.setupDate,
      setupTime: eventData.setupTime,
      venue: eventData.venue,
      venueAddress: eventData.venueAddress,
      contactPerson: eventData.contactPerson,
      contactPhone: eventData.contactPhone,
      estimatedGuests: eventData.estimatedGuests,
      serviceType: eventData.serviceType,
      quotedAmount: eventData.quotedAmount,
      employeeId: eventData.employeeId,
      designNotes: eventData.designNotes,
      setupNotes: eventData.setupNotes,
      internalNotes: eventData.internalNotes,
      customerNotes: eventData.customerNotes,
      quoteEmailSent: false
    }

    const createdEvent = await this.eventRepository.save(event as Event)
    
    // Add event items if provided
    if (eventData.items && eventData.items.length > 0) {
      for (let i = 0; i < eventData.items.length; i++) {
        const itemData = eventData.items[i]
        await this.addEventItem(createdEvent.id, {
          ...itemData,
          isCompleted: false,
          sortOrder: i + 1
        })
      }
    }

    return createdEvent
  }

  async findById(id: string): Promise<Event | null> {
    return await this.eventRepository.findById(id)
  }

  async findByNumber(eventNumber: number): Promise<Event | null> {
    return await this.eventRepository.findByNumber(eventNumber)
  }

  async update(id: string, updates: Partial<Event>): Promise<Event> {
    const existingEvent = await this.eventRepository.findById(id)
    if (!existingEvent) {
      throw new Error(`Event with id ${id} not found`)
    }

    const updatedEvent = { ...existingEvent, ...updates, updatedAt: new Date() }
    return await this.eventRepository.save(updatedEvent)
  }

  async delete(id: string): Promise<void> {
    await this.eventRepository.delete(id)
  }

  // ===== EVENT SEARCH AND FILTERING =====

  async searchEvents(filters: EventSearchFilters): Promise<EventSearchResult> {
    return await this.eventRepository.search(filters)
  }

  async findEventsByCustomer(customerId: string): Promise<Event[]> {
    return await this.eventRepository.findByCustomer(customerId)
  }

  async findEventsByEmployee(employeeId: string): Promise<Event[]> {
    return await this.eventRepository.findByEmployee(employeeId)
  }

  async findEventsByDateRange(dateFrom: string, dateTo: string): Promise<Event[]> {
    return await this.eventRepository.findByDateRange(dateFrom, dateTo)
  }

  async findUpcomingEvents(days: number = 30): Promise<Event[]> {
    return await this.eventRepository.findUpcoming(days)
  }

  async findOverdueEvents(): Promise<Event[]> {
    return await this.eventRepository.findOverdue()
  }

  // ===== EVENT STATUS MANAGEMENT =====

  async updateEventStatus(eventId: string, statusRequest: UpdateEventStatusRequest): Promise<Event> {
    const event = await this.eventRepository.findById(eventId)
    if (!event) {
      throw new Error(`Event with id ${eventId} not found`)
    }

    // Validate status transition
    this.validateStatusTransition(event.status, statusRequest.status)

    // Update status
    const updatedEvent = await this.eventRepository.updateStatus(eventId, statusRequest.status, statusRequest.notes)
    if (!updatedEvent) {
      throw new Error('Failed to update event status')
    }

    // Handle status-specific business logic
    await this.handleStatusChange(updatedEvent, statusRequest.status)

    return updatedEvent
  }

  private validateStatusTransition(currentStatus: EventStatus, newStatus: EventStatus): void {
    // Define valid status transitions
    const validTransitions: Record<EventStatus, EventStatus[]> = {
      [EventStatus.INQUIRY]: [EventStatus.QUOTE_REQUESTED, EventStatus.CANCELLED, EventStatus.REJECTED],
      [EventStatus.QUOTE_REQUESTED]: [EventStatus.QUOTE_SENT, EventStatus.CANCELLED, EventStatus.REJECTED],
      [EventStatus.QUOTE_SENT]: [EventStatus.QUOTE_APPROVED, EventStatus.QUOTE_REQUESTED, EventStatus.CANCELLED, EventStatus.REJECTED],
      [EventStatus.QUOTE_APPROVED]: [EventStatus.DEPOSIT_RECEIVED, EventStatus.CANCELLED],
      [EventStatus.DEPOSIT_RECEIVED]: [EventStatus.IN_PRODUCTION, EventStatus.CANCELLED],
      [EventStatus.IN_PRODUCTION]: [EventStatus.READY_FOR_INSTALL, EventStatus.CANCELLED],
      [EventStatus.READY_FOR_INSTALL]: [EventStatus.INSTALLED, EventStatus.IN_PRODUCTION, EventStatus.CANCELLED],
      [EventStatus.INSTALLED]: [EventStatus.COMPLETED, EventStatus.CANCELLED],
      [EventStatus.COMPLETED]: [], // Terminal status
      [EventStatus.CANCELLED]: [], // Terminal status
      [EventStatus.REJECTED]: [] // Terminal status
    }

    const allowedTransitions = validTransitions[currentStatus] || []
    if (!allowedTransitions.includes(newStatus) && currentStatus !== newStatus) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`)
    }
  }

  private async handleStatusChange(event: Event, newStatus: EventStatus): Promise<void> {
    switch (newStatus) {
      case EventStatus.QUOTE_SENT:
        // Mark quote email as sent
        await this.eventRepository.save({
          ...event,
          quoteEmailSent: true,
          quoteEmailDate: new Date().toISOString()
        })
        break
      
      case EventStatus.COMPLETED:
        // Mark event as completed
        await this.eventRepository.save({
          ...event,
          completedAt: new Date().toISOString()
        })
        break
    }
  }

  async getEventStatusHistory(eventId: string): Promise<Array<{ status: EventStatus; changedAt: string; notes?: string; employeeName?: string }>> {
    return await this.eventRepository.getEventStatusHistory(eventId)
  }

  // ===== EVENT ITEMS MANAGEMENT =====

  async getEventItems(eventId: string): Promise<EventItem[]> {
    return await this.eventRepository.getEventItems(eventId)
  }

  async addEventItem(eventId: string, itemData: CreateEventItemRequest & { isCompleted?: boolean; sortOrder?: number }): Promise<EventItem> {
    const totalPrice = EventHelper.calculateItemTotal(itemData.quantity, itemData.unitPrice)
    
    const item: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'> = {
      eventId,
      category: itemData.category,
      description: itemData.description,
      quantity: itemData.quantity,
      unitPrice: itemData.unitPrice,
      totalPrice,
      productionNotes: itemData.productionNotes,
      isCompleted: itemData.isCompleted || false,
      sortOrder: itemData.sortOrder || 1
    }

    const createdItem = await this.eventRepository.addEventItem(eventId, item)
    if (!createdItem) {
      throw new Error('Failed to add event item')
    }

    return createdItem
  }

  async updateEventItem(eventId: string, itemId: string, updates: Partial<EventItem>): Promise<EventItem> {
    // Recalculate total if quantity or unit price changed
    if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
      const existingItem = await this.eventRepository.getEventItems(eventId)
      const item = existingItem.find(i => i.id === itemId)
      if (item) {
        const quantity = updates.quantity !== undefined ? updates.quantity : item.quantity
        const unitPrice = updates.unitPrice !== undefined ? updates.unitPrice : item.unitPrice
        updates.totalPrice = EventHelper.calculateItemTotal(quantity, unitPrice)
      }
    }

    const updatedItem = await this.eventRepository.updateEventItem(eventId, itemId, updates)
    if (!updatedItem) {
      throw new Error('Failed to update event item')
    }

    return updatedItem
  }

  async deleteEventItem(eventId: string, itemId: string): Promise<void> {
    const success = await this.eventRepository.deleteEventItem(eventId, itemId)
    if (!success) {
      throw new Error('Failed to delete event item')
    }
  }

  async markEventItemCompleted(eventId: string, itemId: string): Promise<EventItem> {
    const updatedItem = await this.eventRepository.markItemCompleted(eventId, itemId)
    if (!updatedItem) {
      throw new Error('Failed to mark item as completed')
    }

    // Check if all items are completed and update event status if needed
    await this.checkAndUpdateProductionStatus(eventId)

    return updatedItem
  }

  private async checkAndUpdateProductionStatus(eventId: string): Promise<void> {
    const event = await this.eventRepository.findById(eventId)
    const items = await this.eventRepository.getEventItems(eventId)
    
    if (event && event.status === EventStatus.IN_PRODUCTION && items.length > 0) {
      const allCompleted = items.every(item => item.isCompleted)
      if (allCompleted) {
        await this.updateEventStatus(eventId, { status: EventStatus.READY_FOR_INSTALL })
      }
    }
  }

  async calculateEventTotal(eventId: string): Promise<number> {
    const items = await this.eventRepository.getEventItems(eventId)
    return EventHelper.calculateEventTotal(items)
  }

  // ===== EVENT PAYMENTS MANAGEMENT =====

  async getEventPayments(eventId: string): Promise<EventPayment[]> {
    return await this.eventRepository.getEventPayments(eventId)
  }

  async addEventPayment(paymentData: CreateEventPaymentRequest): Promise<EventPayment> {
    const payment: Omit<EventPayment, 'id' | 'createdAt' | 'updatedAt'> = {
      eventId: paymentData.eventId,
      amount: paymentData.amount,
      paymentType: paymentData.paymentType,
      status: paymentData.status,
      description: paymentData.description,
      reference: paymentData.reference,
      notes: paymentData.notes,
      dueDate: paymentData.dueDate,
      receivedDate: paymentData.receivedDate
    }

    const createdPayment = await this.eventRepository.addEventPayment(payment)
    if (!createdPayment) {
      throw new Error('Failed to add event payment')
    }

    // Check if payment affects event status
    await this.checkAndUpdatePaymentStatus(paymentData.eventId)

    return createdPayment
  }

  async updateEventPayment(eventId: string, paymentId: string, updates: Partial<EventPayment>): Promise<EventPayment> {
    const updatedPayment = await this.eventRepository.updateEventPayment(eventId, paymentId, updates)
    if (!updatedPayment) {
      throw new Error('Failed to update event payment')
    }

    // Check if payment status change affects event status
    await this.checkAndUpdatePaymentStatus(eventId)

    return updatedPayment
  }

  async deleteEventPayment(eventId: string, paymentId: string): Promise<void> {
    const success = await this.eventRepository.deleteEventPayment(eventId, paymentId)
    if (!success) {
      throw new Error('Failed to delete event payment')
    }

    await this.checkAndUpdatePaymentStatus(eventId)
  }

  private async checkAndUpdatePaymentStatus(eventId: string): Promise<void> {
    const event = await this.eventRepository.findById(eventId)
    const payments = await this.eventRepository.getEventPayments(eventId)
    
    if (!event) return

    const paymentSummary = EventHelper.calculatePaymentSummary(payments)
    const eventTotal = event.finalAmount || event.quotedAmount || 0
    
    // If we have received payments and event is quote approved, move to deposit received
    if (event.status === EventStatus.QUOTE_APPROVED && paymentSummary.received > 0) {
      await this.updateEventStatus(eventId, { status: EventStatus.DEPOSIT_RECEIVED })
    }
    
    // If fully paid and event is installed, move to completed
    if (event.status === EventStatus.INSTALLED && paymentSummary.received >= eventTotal) {
      await this.updateEventStatus(eventId, { status: EventStatus.COMPLETED })
    }
  }

  async calculatePaymentSummary(eventId: string): Promise<{ received: number; pending: number; total: number; remaining: number }> {
    const event = await this.eventRepository.findById(eventId)
    const payments = await this.eventRepository.getEventPayments(eventId)
    
    if (!event) {
      throw new Error(`Event with id ${eventId} not found`)
    }

    const paymentSummary = EventHelper.calculatePaymentSummary(payments)
    const eventTotal = event.finalAmount || event.quotedAmount || 0
    const remaining = Math.max(0, eventTotal - paymentSummary.received)

    return {
      ...paymentSummary,
      remaining
    }
  }

  // ===== QUOTES MANAGEMENT =====

  async getEventQuotes(eventId: string): Promise<EventQuote[]> {
    return await this.eventRepository.getEventQuotes(eventId)
  }

  async createQuote(quoteData: CreateQuoteRequest): Promise<EventQuote> {
    const quote: Omit<EventQuote, 'id' | 'createdAt' | 'updatedAt'> = {
      eventId: quoteData.eventId,
      quotedAmount: quoteData.quotedAmount,
      validUntil: quoteData.validUntil,
      notes: quoteData.notes,
      items: quoteData.items.map((item, index) => ({
        id: `temp-${Date.now()}-${index}`,
        eventQuoteId: '', // Will be set after quote creation
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: EventHelper.calculateItemTotal(item.quantity, item.unitPrice),
        notes: item.productionNotes,
        sortOrder: index + 1
      }))
    }

    const createdQuote = await this.eventRepository.createQuote(quote)
    if (!createdQuote) {
      throw new Error('Failed to create quote')
    }

    return createdQuote
  }

  async sendQuote(eventId: string, quoteId: string): Promise<void> {
    const success = await this.eventRepository.sendQuote(eventId, quoteId)
    if (!success) {
      throw new Error('Failed to send quote')
    }

    // Update event status to quote sent
    await this.updateEventStatus(eventId, { status: EventStatus.QUOTE_SENT })
  }

  async approveQuote(eventId: string, quoteId: string): Promise<void> {
    const success = await this.eventRepository.approveQuote(eventId, quoteId)
    if (!success) {
      throw new Error('Failed to approve quote')
    }

    // Update event status to quote approved
    await this.updateEventStatus(eventId, { status: EventStatus.QUOTE_APPROVED })
  }

  // ===== INSTALLATIONS MANAGEMENT =====

  async getEventInstallations(eventId: string): Promise<EventInstallation[]> {
    return await this.eventRepository.getEventInstallations(eventId)
  }

  async scheduleInstallation(eventId: string, installationData: Omit<EventInstallation, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): Promise<EventInstallation> {
    const installation: Omit<EventInstallation, 'id' | 'createdAt' | 'updatedAt'> = {
      eventId,
      ...installationData,
      status: InstallationStatus.SCHEDULED
    }

    const createdInstallation = await this.eventRepository.scheduleInstallation(installation)
    if (!createdInstallation) {
      throw new Error('Failed to schedule installation')
    }

    return createdInstallation
  }

  async updateInstallation(eventId: string, installationId: string, updates: Partial<EventInstallation>): Promise<EventInstallation> {
    const updatedInstallation = await this.eventRepository.updateInstallation(eventId, installationId, updates)
    if (!updatedInstallation) {
      throw new Error('Failed to update installation')
    }

    // Update event status based on installation status
    if (updates.status === InstallationStatus.COMPLETED) {
      await this.updateEventStatus(eventId, { status: EventStatus.INSTALLED })
    }

    return updatedInstallation
  }

  // ===== ANALYTICS =====

  async getEventAnalytics(dateFrom: Date, dateTo: Date): Promise<EventAnalytics | null> {
    return await this.eventRepository.getEventAnalytics(dateFrom, dateTo)
  }

  async getMonthlyRevenue(year: number): Promise<Array<{ month: string; revenue: number; eventCount: number }>> {
    return await this.eventRepository.getRevenueByMonth(year)
  }

  async getTopVenues(limit: number = 10): Promise<Array<{ venue: string; eventCount: number; totalRevenue: number }>> {
    return await this.eventRepository.getTopVenues(limit)
  }

  async getStaffPerformance(): Promise<Array<{ employeeId: string; employeeName: string; eventCount: number; totalRevenue: number }>> {
    return await this.eventRepository.getStaffPerformance()
  }

  // ===== UTILITY METHODS =====

  async searchVenues(query: string): Promise<string[]> {
    return await this.eventRepository.searchVenues(query)
  }

  async isEventOverdue(eventId: string): Promise<boolean> {
    const event = await this.eventRepository.findById(eventId)
    if (!event) return false
    return EventHelper.isEventOverdue(event)
  }

  async getDashboardSummary(): Promise<{
    upcomingEvents: Event[]
    overdueEvents: Event[]
    recentPayments: EventPayment[]
    productionItems: EventItem[]
    pendingQuotes: Event[]
  }> {
    const [upcomingEvents, overdueEvents] = await Promise.all([
      this.findUpcomingEvents(7), // Next 7 days
      this.findOverdueEvents()
    ])

    // Get events that need quotes
    const pendingQuotes = (await this.searchEvents({
      status: EventStatus.QUOTE_REQUESTED
    })).events

    // Get items in production
    const productionEvents = (await this.searchEvents({
      status: EventStatus.IN_PRODUCTION
    })).events

    const productionItems: EventItem[] = []
    for (const event of productionEvents) {
      const items = await this.getEventItems(event.id)
      productionItems.push(...items.filter(item => !item.isCompleted))
    }

    // Recent payments placeholder (would need payment date filtering)
    const recentPayments: EventPayment[] = []

    return {
      upcomingEvents,
      overdueEvents,
      recentPayments,
      productionItems,
      pendingQuotes
    }
  }

  // ===== BULK OPERATIONS =====

  async bulkUpdateStatus(eventIds: string[], status: EventStatus, notes?: string): Promise<void> {
    const success = await this.eventRepository.bulkUpdateStatus(eventIds, status, notes)
    if (!success) {
      throw new Error('Failed to bulk update event status')
    }
  }

  async exportEvents(filters: EventSearchFilters, format: 'csv' | 'excel' = 'csv'): Promise<Blob | null> {
    return await this.eventRepository.exportEvents(filters, format)
  }
}
