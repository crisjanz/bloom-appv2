/**
 * Centralized API Service
 * All API calls go through this service for consistency, error handling, and monitoring
 */

import { ApiResponse, Result, DomainError } from '../../types/common'

export interface RequestOptions extends RequestInit {
  timeout?: number
  retries?: number
}

export class ApiError extends DomainError {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message, 'API_ERROR', { status, response })
    this.name = 'ApiError'
  }
}

export class ApiService {
  private static readonly DEFAULT_TIMEOUT = 10000 // 10 seconds
  private static readonly DEFAULT_RETRIES = 3

  /**
   * Make a centralized API call with error handling, retries, and monitoring
   */
  static async call<T>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<Result<T, ApiError>> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      retries = this.DEFAULT_RETRIES,
      ...fetchOptions
    } = options

    let lastError: ApiError | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(endpoint, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          lastError = new ApiError(
            `API call failed: ${response.status} ${response.statusText}`,
            response.status,
            errorText
          )
          
          // Don't retry on client errors (4xx), only server errors (5xx)
          if (response.status >= 400 && response.status < 500) {
            break
          }
          
          continue // Retry on server errors
        }

        const data = await response.json()
        return { success: true, data }

      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          lastError = new ApiError('Request timeout', 408)
        } else if (error instanceof ApiError) {
          lastError = error
        } else {
          lastError = new ApiError(
            error instanceof Error ? error.message : 'Unknown error',
            0
          )
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000)
        }
      }
    }

    // Log error for monitoring
    this.logError(endpoint, lastError)
    return { success: false, error: lastError! }
  }

  /**
   * GET request
   */
  static async get<T>(endpoint: string, options?: RequestOptions): Promise<Result<T, ApiError>> {
    return this.call<T>(endpoint, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  static async post<T>(
    endpoint: string, 
    data: any, 
    options?: RequestOptions
  ): Promise<Result<T, ApiError>> {
    return this.call<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * PUT request
   */
  static async put<T>(
    endpoint: string, 
    data: any, 
    options?: RequestOptions
  ): Promise<Result<T, ApiError>> {
    return this.call<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  /**
   * PATCH request
   */
  static async patch<T>(
    endpoint: string,
    data: any,
    options?: RequestOptions
  ): Promise<Result<T, ApiError>> {
    return this.call<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }

  /**
   * DELETE request
   */
  static async delete<T>(endpoint: string, options?: RequestOptions): Promise<Result<T, ApiError>> {
    return this.call<T>(endpoint, { ...options, method: 'DELETE' })
  }

  /**
   * Centralized error logging
   */
  private static logError(endpoint: string, error: ApiError | null): void {
    console.error('API Error:', {
      endpoint,
      error: error?.message,
      status: error?.status,
      timestamp: new Date().toISOString()
    })
    
    // In production, send to error monitoring service
    // e.g., Sentry, LogRocket, etc.
  }

  /**
   * Delay utility for retries
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Health check utility
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const result = await this.get('/api/health', { timeout: 5000 })
      return result.success
    } catch {
      return false
    }
  }

  /**
   * Create auth headers (for future authentication)
   */
  static createAuthHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }
}
