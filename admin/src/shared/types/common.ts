/**
 * Common types and interfaces for the DDD architecture
 * These are the foundation interfaces that all domains build upon
 */

// Base entity interface - all domain entities extend this
export interface DomainEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

// Generic service interface - all domain services implement this pattern
export interface DomainService<T> {
  create(data: Partial<T>): Promise<T>
  findById(id: string): Promise<T | null>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}

// Generic repository interface - all repositories implement this pattern
export interface Repository<T> {
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>
  findById(id: string): Promise<T | null>
  findMany(ids: string[]): Promise<T[]>
  findAll(options?: SearchOptions): Promise<PaginatedResult<T>>
  update(id: string, updates: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}

// API Response patterns
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Result pattern for error handling (no throwing exceptions)
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

// Common validation interface
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  code?: string
}

// Event pattern for domain events
export interface DomainEvent {
  eventType: string
  entityId: string
  entityType: string
  timestamp: Date
  data: Record<string, any>
}

// Common filter interface for list queries
export interface QueryFilter {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  filters?: Record<string, any>
}

// Search options interface
export interface SearchOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Common pagination interface
export interface PaginatedResult<T> {
  data: T[]
  items: T[] // Keep both for compatibility
  total: number
  totalCount: number // Keep both for compatibility
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Money/Currency representation (always in cents for precision)
export interface Money {
  amount: number // Always in cents
  currency: string // e.g., 'CAD', 'USD'
}

// Common address interface (used across multiple domains)
export interface Address {
  id?: string
  street1: string
  street2?: string
  city: string
  province: string
  postalCode: string
  country: string
  latitude?: number
  longitude?: number
  isDefault?: boolean
}

// Common audit trail interface
export interface AuditTrail {
  action: string
  entityType: string
  entityId: string
  userId?: string
  timestamp: Date
  changes?: Record<string, { from: any; to: any }>
  metadata?: Record<string, any>
}

// Generic configuration interface
export interface DomainConfig {
  [key: string]: any
}

// Common error types
export class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export class ValidationDomainError extends DomainError {
  constructor(message: string, public validationErrors: ValidationError[]) {
    super(message, 'VALIDATION_ERROR', { validationErrors })
    this.name = 'ValidationDomainError'
  }
}

export class NotFoundError extends DomainError {
  constructor(entityType: string, entityId: string) {
    super(`${entityType} with id ${entityId} not found`, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

// Common enum types
export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
  PENDING = 'PENDING'
}

export enum Channel {
  POS = 'POS',
  WEBSITE = 'WEBSITE',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  SMS = 'SMS'
}

// Type guards for better type safety
export const isDomainEntity = (obj: any): obj is DomainEntity => {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'string' &&
         obj.createdAt instanceof Date &&
         obj.updatedAt instanceof Date
}

export const isSuccessResult = <T>(result: Result<T>): result is { success: true; data: T } => {
  return result.success === true
}

export const isErrorResult = <T>(result: Result<T>): result is { success: false; error: Error } => {
  return result.success === false
}