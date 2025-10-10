/**
 * Events Domain Entities
 * Comprehensive wedding and event management system
 */

import { DomainEntity } from '@shared/types/common'

// ===== ENUMS =====

export enum EventType {
  WEDDING = 'WEDDING',
  CORPORATE = 'CORPORATE', 
  BIRTHDAY = 'BIRTHDAY',
  ANNIVERSARY = 'ANNIVERSARY',
  FUNERAL = 'FUNERAL',
  GRADUATION = 'GRADUATION',
  OTHER = 'OTHER'
}

export enum EventStatus {
  INQUIRY = 'INQUIRY',
  QUOTE_REQUESTED = 'QUOTE_REQUESTED',
  QUOTE_SENT = 'QUOTE_SENT',
  QUOTE_APPROVED = 'QUOTE_APPROVED',
  DEPOSIT_RECEIVED = 'DEPOSIT_RECEIVED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  READY_FOR_INSTALL = 'READY_FOR_INSTALL',
  INSTALLED = 'INSTALLED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export enum ServiceType {
  FULL_SERVICE = 'FULL_SERVICE',
  DELIVERY_ONLY = 'DELIVERY_ONLY',
  PICKUP = 'PICKUP',
  CONSULTATION = 'CONSULTATION'
}

export enum EventPaymentType {
  CASH = 'CASH',
  CHECK = 'CHECK',
  BANK_TRANSFER = 'BANK_TRANSFER',
  POS_SYSTEM = 'POS_SYSTEM',
  CREDIT_CARD = 'CREDIT_CARD',
  OTHER = 'OTHER'
}

export enum EventPaymentStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

// ===== CORE ENTITIES =====

export interface Event extends DomainEntity {
  eventNumber: number
  eventType: EventType
  eventName: string
  description?: string
  status: EventStatus
  
  // Customer relationship
  customerId: string
  
  // Scheduling
  eventDate: string // ISO date
  setupDate?: string // ISO date
  setupTime?: string
  
  // Venue information
  venue: string
  venueAddress?: string
  contactPerson?: string
  contactPhone?: string
  estimatedGuests?: number
  
  // Service details
  serviceType?: ServiceType
  
  // Financial
  quotedAmount?: number
  finalAmount?: number
  
  // Staff assignment
  employeeId?: string
  
  // Notes and communications
  designNotes?: string
  setupNotes?: string
  internalNotes?: string
  customerNotes?: string
  lastContactDate?: string
  quoteEmailSent: boolean
  quoteEmailDate?: string
  
  // Completion tracking
  completedAt?: string // ISO date
}

export interface EventItem extends DomainEntity {
  eventId: string
  category: string
  description: string
  quantity: number
  unitPrice: number // in dollars
  totalPrice: number // in dollars
  productionNotes?: string
  
  // Production tracking
  isCompleted: boolean
  completedAt?: string // ISO date
  sortOrder: number
}

export interface EventPayment extends DomainEntity {
  eventId: string
  amount: number // in dollars
  paymentType: EventPaymentType
  status: EventPaymentStatus
  description?: string
  reference?: string // check number, transaction ID, etc.
  notes?: string
  
  // Scheduling
  dueDate?: string // ISO date
  receivedDate?: string // ISO date
  
  // Staff tracking
  employeeId?: string
}

export interface EventQuote extends DomainEntity {
  eventId: string
  quotedAmount: number // in dollars
  validUntil?: string // ISO date
  notes?: string
  
  // Quote items (detailed breakdown)
  items: EventQuoteItem[]
  
  // Status tracking
  sentAt?: string // ISO date
  approvedAt?: string // ISO date
  rejectedAt?: string // ISO date
  employeeId?: string
}

export interface EventQuoteItem {
  id: string
  eventQuoteId: string
  category: string
  description: string
  quantity: number
  unitPrice: number // in dollars
  totalPrice: number // in dollars
  notes?: string
  sortOrder: number
}

export interface EventInstallation extends DomainEntity {
  eventId: string
  scheduledDate: string // ISO date
  scheduledTime?: string
  estimatedDuration?: number // in minutes
  
  // Location details
  installationAddress?: string
  specialInstructions?: string
  
  // Staff assignment
  teamLeadId?: string
  teamMemberIds: string[]
  
  // Completion tracking
  startedAt?: string // ISO timestamp
  completedAt?: string // ISO timestamp
  notes?: string
  
  // Status
  status: InstallationStatus
}

export enum InstallationStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS', 
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
  CANCELLED = 'CANCELLED'
}

// ===== SEARCH AND FILTER INTERFACES =====

export interface EventSearchFilters {
  query?: string
  status?: EventStatus
  eventType?: EventType
  customerId?: string
  employeeId?: string
  dateFrom?: string // ISO date
  dateTo?: string // ISO date
  venueSearch?: string
  hasOutstandingBalance?: boolean
}

export interface EventSearchResult {
  events: Event[]
  total: number
  filters: EventSearchFilters
}

// ===== ANALYTICS INTERFACES =====

export interface EventAnalytics {
  totalEvents: number
  totalRevenue: number
  averageEventValue: number
  
  // Status breakdown
  statusBreakdown: Record<EventStatus, number>
  
  // Type breakdown
  typeBreakdown: Record<EventType, number>
  
  // Revenue tracking
  paidAmount: number
  pendingAmount: number
  quotedAmount: number
  
  // Popular venues
  topVenues: Array<{
    venue: string
    eventCount: number
    totalRevenue: number
  }>
  
  // Staff performance
  staffPerformance: Array<{
    employeeId: string
    employeeName: string
    eventCount: number
    totalRevenue: number
  }>
  
  // Monthly trends
  monthlyTrends: Array<{
    month: string
    eventCount: number
    revenue: number
  }>
}

// ===== REQUEST/RESPONSE INTERFACES =====

export interface CreateEventRequest {
  eventType: EventType
  eventName: string
  description?: string
  customerId: string
  eventDate: string
  setupDate?: string
  setupTime?: string
  venue: string
  venueAddress?: string
  contactPerson?: string
  contactPhone?: string
  estimatedGuests?: number
  serviceType?: ServiceType
  quotedAmount?: number
  employeeId?: string
  designNotes?: string
  setupNotes?: string
  internalNotes?: string
  customerNotes?: string
  items?: CreateEventItemRequest[]
}

export interface CreateEventItemRequest {
  category: string
  description: string
  quantity: number
  unitPrice: number
  productionNotes?: string
}

export interface CreateEventPaymentRequest {
  eventId: string
  amount: number
  paymentType: EventPaymentType
  status: EventPaymentStatus
  description?: string
  reference?: string
  notes?: string
  dueDate?: string
  receivedDate?: string
}

export interface UpdateEventStatusRequest {
  status: EventStatus
  notes?: string
}

export interface CreateQuoteRequest {
  eventId: string
  quotedAmount: number
  validUntil?: string
  notes?: string
  items: CreateEventItemRequest[]
}

// ===== HELPER FUNCTIONS =====

export class EventHelper {
  static getStatusColor(status: EventStatus): string {
    const colors = {
      [EventStatus.INQUIRY]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      [EventStatus.QUOTE_REQUESTED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      [EventStatus.QUOTE_SENT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      [EventStatus.QUOTE_APPROVED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      [EventStatus.DEPOSIT_RECEIVED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      [EventStatus.IN_PRODUCTION]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      [EventStatus.READY_FOR_INSTALL]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      [EventStatus.INSTALLED]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
      [EventStatus.COMPLETED]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
      [EventStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      [EventStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }

  static getStatusLabel(status: EventStatus): string {
    const labels = {
      [EventStatus.INQUIRY]: 'Inquiry',
      [EventStatus.QUOTE_REQUESTED]: 'Quote Requested',
      [EventStatus.QUOTE_SENT]: 'Quote Sent',
      [EventStatus.QUOTE_APPROVED]: 'Quote Approved',
      [EventStatus.DEPOSIT_RECEIVED]: 'Deposit Received',
      [EventStatus.IN_PRODUCTION]: 'In Production',
      [EventStatus.READY_FOR_INSTALL]: 'Ready for Install',
      [EventStatus.INSTALLED]: 'Installed',
      [EventStatus.COMPLETED]: 'Completed',
      [EventStatus.CANCELLED]: 'Cancelled',
      [EventStatus.REJECTED]: 'Rejected'
    }
    return labels[status] || status
  }

  static getTypeIcon(type: EventType): string {
    const icons = {
      [EventType.WEDDING]: '💒',
      [EventType.CORPORATE]: '🏢',
      [EventType.BIRTHDAY]: '🎂',
      [EventType.ANNIVERSARY]: '💕',
      [EventType.FUNERAL]: '🕊️',
      [EventType.GRADUATION]: '🎓',
      [EventType.OTHER]: '🎉'
    }
    return icons[type] || '🎉'
  }

  static getPaymentTypeIcon(type: EventPaymentType): string {
    const icons = {
      [EventPaymentType.CASH]: '💵',
      [EventPaymentType.CHECK]: '🏦',
      [EventPaymentType.BANK_TRANSFER]: '💳',
      [EventPaymentType.POS_SYSTEM]: '🏪',
      [EventPaymentType.CREDIT_CARD]: '💳',
      [EventPaymentType.OTHER]: '📄'
    }
    return icons[type] || '📄'
  }

  static calculateItemTotal(quantity: number, unitPrice: number): number {
    return quantity * unitPrice
  }

  static calculateEventTotal(items: EventItem[]): number {
    return items.reduce((sum, item) => sum + item.totalPrice, 0)
  }

  static calculatePaymentSummary(payments: EventPayment[]) {
    const received = payments
      .filter(p => p.status === EventPaymentStatus.RECEIVED)
      .reduce((sum, p) => sum + p.amount, 0)
    
    const pending = payments
      .filter(p => p.status === EventPaymentStatus.PENDING)
      .reduce((sum, p) => sum + p.amount, 0)
    
    return { received, pending, total: received + pending }
  }

  static getNextEventNumber(): number {
    // This would typically come from the database
    // For now, return a timestamp-based number
    return Date.now() % 1000000
  }

  static isEventOverdue(event: Event): boolean {
    if (!event.eventDate) return false
    const eventDate = new Date(event.eventDate)
    const today = new Date()
    return eventDate < today && event.status !== EventStatus.COMPLETED
  }

  static getEventWorkflow(): Array<{ status: EventStatus; label: string; description: string }> {
    return [
      { 
        status: EventStatus.INQUIRY, 
        label: 'Initial Inquiry', 
        description: 'Customer has made initial contact' 
      },
      { 
        status: EventStatus.QUOTE_REQUESTED, 
        label: 'Quote Requested', 
        description: 'Customer has requested a formal quote' 
      },
      { 
        status: EventStatus.QUOTE_SENT, 
        label: 'Quote Sent', 
        description: 'Quote has been sent to customer' 
      },
      { 
        status: EventStatus.QUOTE_APPROVED, 
        label: 'Quote Approved', 
        description: 'Customer has approved the quote' 
      },
      { 
        status: EventStatus.DEPOSIT_RECEIVED, 
        label: 'Deposit Received', 
        description: 'Deposit payment has been received' 
      },
      { 
        status: EventStatus.IN_PRODUCTION, 
        label: 'In Production', 
        description: 'Items are being created/prepared' 
      },
      { 
        status: EventStatus.READY_FOR_INSTALL, 
        label: 'Ready for Installation', 
        description: 'All items ready, awaiting setup' 
      },
      { 
        status: EventStatus.INSTALLED, 
        label: 'Installed', 
        description: 'Event setup has been completed' 
      },
      { 
        status: EventStatus.COMPLETED, 
        label: 'Completed', 
        description: 'Event finished and payment received' 
      }
    ]
  }
}

// ===== TYPE GUARDS =====

export function isEventType(value: string): value is EventType {
  return Object.values(EventType).includes(value as EventType)
}

export function isEventStatus(value: string): value is EventStatus {
  return Object.values(EventStatus).includes(value as EventStatus)
}

export function isEventPaymentType(value: string): value is EventPaymentType {
  return Object.values(EventPaymentType).includes(value as EventPaymentType)
}

export function isEventPaymentStatus(value: string): value is EventPaymentStatus {
  return Object.values(EventPaymentStatus).includes(value as EventPaymentStatus)
}