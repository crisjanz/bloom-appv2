/**
 * Shared Module - Index
 * Exports all shared types, interfaces, and utilities
 */

// ===== TYPES =====
export * from './types/common'

// ===== HOOKS =====
export * from './hooks/useApiClient'

// ===== SHARED INFO =====
export const SHARED_MODULE = {
  name: 'shared',
  version: '1.0.0',
  description: 'Common types, interfaces, and utilities for the DDD architecture',
  types: [
    'DomainEntity',
    'Repository',
    'DomainService',
    'ApiResponse',
    'Result',
    'PaginatedResult',
    'SearchOptions',
    'Money',
    'Address',
    'AuditTrail'
  ],
  hooks: [
    'useApiClient'
  ]
} as const