/**
 * Base Repository Pattern
 * All domain repositories extend this for consistent data access patterns
 */

import { DomainEntity, QueryFilter, PaginatedResult, Result, NotFoundError, SearchOptions } from '../../types/common'
import { ApiService, ApiError } from '../api/ApiService'

const unwrapResult = <R>(result: Result<R, ApiError>, fallbackMessage: string): R => {
  if (result.success) {
    return result.data
  }

  if ('error' in result && result.error) {
    throw result.error
  }

  throw new ApiError(fallbackMessage, 500)
}

export abstract class BaseRepository<T extends DomainEntity> {
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

    return unwrapResult(result, `Failed to save ${this.entityName}`)
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    const result = await ApiService.get<T | null>(`${this.endpoint}/${id}`)

    if (result.success) {
      return result.data
    }

    if ('error' in result && result.error?.status === 404) {
      return null
    }

    if ('error' in result && result.error) {
      throw result.error
    }

    throw new ApiError(`Failed to fetch ${this.entityName}`, 500)
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
  async findAll(options: SearchOptions = {}): Promise<T[]> {
    const queryParams = new URLSearchParams()
    if (options.page) queryParams.set('page', options.page.toString())
    if (options.limit) queryParams.set('limit', options.limit.toString())
    const url = queryParams.toString() ? `${this.endpoint}?${queryParams.toString()}` : this.endpoint
    const result = await ApiService.get<T[]>(url)
    return unwrapResult(result, `Failed to fetch ${this.entityName}`)
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
    return unwrapResult(result, `Failed to fetch ${this.entityName}`)
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<void> {
    const result = await ApiService.delete(`${this.endpoint}/${id}`)
    unwrapResult(result, `Failed to delete ${this.entityName}`)
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
    const data = unwrapResult(result, `Failed to count ${this.entityName}`)
    return data.count
  }

  /**
   * Batch operations
   */
  async saveMany(entities: Partial<T>[]): Promise<T[]> {
    const result = await ApiService.post<T[]>(`${this.endpoint}/batch`, { entities })
    return unwrapResult(result, `Failed to save ${this.entityName}`)
  }

  async deleteMany(ids: string[]): Promise<void> {
    const result = await ApiService.delete(`${this.endpoint}/batch`, {
      body: JSON.stringify({ ids })
    })

    unwrapResult(result, `Failed to delete ${this.entityName}`)
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
    return unwrapResult(result, `Failed to fetch ${this.entityName}`)
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
    
    let result
    if (method === 'POST') {
      result = await ApiService.post<R>(url, data)
    } else if (method === 'PUT') {
      result = await ApiService.put<R>(url, data)
    } else {
      result = await ApiService.patch<R>(url, data)
    }

    return unwrapResult(result, `Failed to mutate ${this.entityName}`)
  }
}
