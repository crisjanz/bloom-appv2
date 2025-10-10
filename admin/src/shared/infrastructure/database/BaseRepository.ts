/**
 * Base Repository Pattern
 * All domain repositories extend this for consistent data access patterns
 */

import { Repository, DomainEntity, QueryFilter, PaginatedResult, Result, NotFoundError } from '../../types/common'
import { ApiService, ApiError } from '../api/ApiService'

export abstract class BaseRepository<T extends DomainEntity> implements Repository<T> {
  protected abstract readonly endpoint: string
  protected abstract readonly entityName: string

  /**
   * Save an entity (create or update)
   */
  async save(entity: Partial<T>): Promise<T> {
    const isUpdate = entity.id !== undefined

    const result = isUpdate 
      ? await ApiService.put<T>(`${this.endpoint}/${entity.id}`, entity)
      : await ApiService.post<T>(this.endpoint, entity)

    if (!result.success) {
      throw result.error
    }

    return result.data
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    const result = await ApiService.get<T | null>(`${this.endpoint}/${id}`)

    if (!result.success) {
      if (result.error.status === 404) {
        return null
      }
      throw result.error
    }

    return result.data
  }

  /**
   * Find entity by ID or throw error
   */
  async findByIdOrThrow(id: string): Promise<T> {
    const entity = await this.findById(id)
    if (!entity) {
      throw new NotFoundError(this.entityName, id)
    }
    return entity
  }

  /**
   * Find all entities
   */
  async findAll(): Promise<T[]> {
    const result = await ApiService.get<T[]>(this.endpoint)

    if (!result.success) {
      throw result.error
    }

    return result.data
  }

  /**
   * Find entities with filtering and pagination
   */
  async findMany(filter: QueryFilter = {}): Promise<PaginatedResult<T>> {
    const queryParams = new URLSearchParams()
    
    if (filter.page) queryParams.set('page', filter.page.toString())
    if (filter.limit) queryParams.set('limit', filter.limit.toString())
    if (filter.sortBy) queryParams.set('sortBy', filter.sortBy)
    if (filter.sortOrder) queryParams.set('sortOrder', filter.sortOrder)
    if (filter.search) queryParams.set('search', filter.search)
    
    // Add custom filters
    if (filter.filters) {
      Object.entries(filter.filters).forEach(([key, value]) => {
        queryParams.set(key, value?.toString() || '')
      })
    }

    const url = `${this.endpoint}?${queryParams.toString()}`
    const result = await ApiService.get<PaginatedResult<T>>(url)

    if (!result.success) {
      throw result.error
    }

    return result.data
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<void> {
    const result = await ApiService.delete(`${this.endpoint}/${id}`)

    if (!result.success) {
      throw result.error
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const entity = await this.findById(id)
      return entity !== null
    } catch {
      return false
    }
  }

  /**
   * Count entities
   */
  async count(filter: QueryFilter = {}): Promise<number> {
    const queryParams = new URLSearchParams()
    
    if (filter.search) queryParams.set('search', filter.search)
    if (filter.filters) {
      Object.entries(filter.filters).forEach(([key, value]) => {
        queryParams.set(key, value?.toString() || '')
      })
    }

    const url = `${this.endpoint}/count?${queryParams.toString()}`
    const result = await ApiService.get<{ count: number }>(url)

    if (!result.success) {
      throw result.error
    }

    return result.data.count
  }

  /**
   * Batch operations
   */
  async saveMany(entities: Partial<T>[]): Promise<T[]> {
    const result = await ApiService.post<T[]>(`${this.endpoint}/batch`, { entities })

    if (!result.success) {
      throw result.error
    }

    return result.data
  }

  async deleteMany(ids: string[]): Promise<void> {
    const result = await ApiService.delete(`${this.endpoint}/batch`, {
      body: JSON.stringify({ ids })
    })

    if (!result.success) {
      throw result.error
    }
  }

  /**
   * Custom query method for domain-specific queries
   */
  protected async customQuery<R>(
    path: string, 
    params?: Record<string, any>
  ): Promise<R> {
    let url = `${this.endpoint}/${path}`
    
    if (params) {
      const queryParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        queryParams.set(key, value?.toString() || '')
      })
      url += `?${queryParams.toString()}`
    }

    const result = await ApiService.get<R>(url)

    if (!result.success) {
      throw result.error
    }

    return result.data
  }

  /**
   * Custom mutation method for domain-specific operations
   */
  protected async customMutation<R>(
    path: string,
    data: any,
    method: 'POST' | 'PUT' | 'PATCH' = 'POST'
  ): Promise<R> {
    const url = `${this.endpoint}/${path}`
    
    const result = method === 'POST' 
      ? await ApiService.post<R>(url, data)
      : await ApiService.put<R>(url, data)

    if (!result.success) {
      throw result.error
    }

    return result.data
  }
}