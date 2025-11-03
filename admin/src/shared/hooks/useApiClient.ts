/**
 * API Client Hook
 * Provides a configured API client for domain repositories
 */

import { useMemo } from 'react'

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

  async get(url: string) {
    const response = await fetch(`${this.baseURL}${url}`)
    const data = await response.json()
    return { data, status: response.status }
  }

  async post(url: string, data?: any) {
    const options: RequestInit = {
      method: 'POST'
    }

    if (data instanceof FormData) {
      options.body = data
    } else if (data !== undefined) {
      options.headers = {
        'Content-Type': 'application/json'
      }
      options.body = JSON.stringify(data)
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    })
    const responseData = await response.json()
    return { data: responseData, status: response.status }
  }

  async patch(url: string, data?: any) {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    })
    const responseData = await response.json()
    return { data: responseData, status: response.status }
  }

  async delete(url: string) {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'DELETE'
    })
    const data = await response.json()
    return { data, status: response.status }
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
