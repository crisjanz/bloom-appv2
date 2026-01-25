/**
 * API Client Hook
 * Provides a configured API client for domain repositories
 */

import { useMemo } from 'react'

// Token storage key
const ACCESS_TOKEN_KEY = 'bloom_access_token'

// Simple API client interface
export interface ApiClient {
  get: (url: string) => Promise<{ data: any; status: number }>
  post: (url: string, data?: any) => Promise<{ data: any; status: number }>
  put: (url: string, data?: any) => Promise<{ data: any; status: number }>
  patch: (url: string, data?: any) => Promise<{ data: any; status: number }>
  delete: (url: string) => Promise<{ data: any; status: number }>
}

// Simple fetch-based API client implementation
class FetchApiClient implements ApiClient {
  private baseURL: string

  constructor(baseURL: string = '') {
    this.baseURL = baseURL
  }

  private buildHeaders(isJson: boolean): HeadersInit {
    const headers: HeadersInit = {}

    if (isJson) {
      headers['Content-Type'] = 'application/json'
    }

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY)
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
    }

    return headers
  }

  async get(url: string) {
    const response = await fetch(`${this.baseURL}${url}`, {
      headers: this.buildHeaders(false)
    })
    const data = await response.json()
    return { data, status: response.status }
  }

  async post(url: string, data?: any) {
    const options: RequestInit = {
      method: 'POST'
    }

    if (data instanceof FormData) {
      options.body = data
      options.headers = this.buildHeaders(false)
    } else if (data !== undefined) {
      options.headers = this.buildHeaders(true)
      options.body = JSON.stringify(data)
    } else {
      options.headers = this.buildHeaders(false)
    }

    const response = await fetch(`${this.baseURL}${url}`, options)
    let responseData: any = null

    try {
      responseData = await response.json()
    } catch {
      responseData = null
    }

    return { data: responseData, status: response.status }
  }

  async put(url: string, data?: any) {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'PUT',
      headers: this.buildHeaders(true),
      body: data ? JSON.stringify(data) : undefined
    })
    const responseData = await response.json()
    return { data: responseData, status: response.status }
  }

  async patch(url: string, data?: any) {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'PATCH',
      headers: this.buildHeaders(true),
      body: data ? JSON.stringify(data) : undefined
    })
    const responseData = await response.json()
    return { data: responseData, status: response.status }
  }

  async delete(url: string) {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'DELETE',
      headers: this.buildHeaders(false)
    })

    let responseData: any = null

    try {
      responseData = await response.json()
    } catch {
      responseData = null
    }

    return { data: responseData, status: response.status }
  }
}

/**
 * Hook to get configured API client
 */
export function useApiClient(): ApiClient {
  return useMemo(() => {
    return new FetchApiClient('')
  }, [])
}
