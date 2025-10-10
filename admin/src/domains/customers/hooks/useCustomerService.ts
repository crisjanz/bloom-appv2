/**
 * React Hook for Customer Service
 * Provides easy access to customer operations from React components
 */

import { useState, useEffect, useCallback } from 'react'
import { CustomerService } from '../services/CustomerService'
import { CustomerRepository } from '../repositories/CustomerRepository'
import { Customer, CustomerSearchCriteria } from '../entities/Customer'

// Create singleton instances (in production, use dependency injection)
const customerRepository = new CustomerRepository()
const customerService = new CustomerService(customerRepository)

export const useCustomerService = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear error when operation starts
  const clearError = useCallback(() => setError(null), [])

  // Generic error handler
  const handleError = useCallback((err: any) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    setError(message)
    console.error('Customer service error:', err)
  }, [])

  // Find customer by phone (POS primary method)
  const findByPhone = useCallback(async (phone: string): Promise<Customer | null> => {
    if (!phone || phone.length < 3) return null
    
    setLoading(true)
    clearError()
    
    try {
      const customer = await customerService.findByPhone(phone)
      return customer
    } catch (err) {
      handleError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [clearError, handleError])

  // Quick search for customer selection
  const quickSearch = useCallback(async (query: string): Promise<Customer[]> => {
    if (!query || query.length < 3) return []
    
    setLoading(true)
    clearError()
    
    try {
      const customers = await customerService.quickSearch(query)
      return customers
    } catch (err) {
      handleError(err)
      return []
    } finally {
      setLoading(false)
    }
  }, [clearError, handleError])

  // Create new customer
  const createCustomer = useCallback(async (customerData: {
    firstName: string
    lastName: string
    phone?: string
    email?: string
    notes?: string
  }): Promise<Customer | null> => {
    setLoading(true)
    clearError()
    
    try {
      const customer = await customerService.create(customerData)
      return customer
    } catch (err) {
      handleError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [clearError, handleError])

  // Create walk-in customer for POS
  const createWalkInCustomer = useCallback(async (): Promise<Customer | null> => {
    setLoading(true)
    clearError()
    
    try {
      const customer = await customerService.createWalkInCustomer()
      return customer
    } catch (err) {
      handleError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [clearError, handleError])

  // Update customer
  const updateCustomer = useCallback(async (
    customerId: string, 
    updates: Partial<Customer>
  ): Promise<Customer | null> => {
    setLoading(true)
    clearError()
    
    try {
      const customer = await customerService.update(customerId, updates)
      return customer
    } catch (err) {
      handleError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [clearError, handleError])

  // Get customer by ID
  const getCustomer = useCallback(async (customerId: string): Promise<Customer | null> => {
    setLoading(true)
    clearError()
    
    try {
      const customer = await customerService.findById(customerId)
      return customer
    } catch (err) {
      handleError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [clearError, handleError])

  return {
    // State
    loading,
    error,
    clearError,
    
    // Customer operations
    findByPhone,
    quickSearch,
    createCustomer,
    createWalkInCustomer,
    updateCustomer,
    getCustomer,
    
    // Direct service access for advanced operations
    customerService
  }
}

// Hook for customer search with debouncing
export const useCustomerSearch = (initialQuery = '') => {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<Customer[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { quickSearch } = useCustomerService()

  // Debounced search effect
  useEffect(() => {
    if (query.length < 3) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      const customers = await quickSearch(query)
      setResults(customers)
      setIsSearching(false)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [query, quickSearch])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
  }, [])

  return {
    query,
    setQuery,
    results,
    isSearching,
    clearSearch
  }
}

// Hook for managing selected customer (for POS cart, etc.)
export const useSelectedCustomer = (initialCustomer?: Customer) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer || null)
  const { getCustomer } = useCustomerService()

  // Refresh customer data
  const refreshCustomer = useCallback(async () => {
    if (!selectedCustomer?.id) return
    
    const updated = await getCustomer(selectedCustomer.id)
    if (updated) {
      setSelectedCustomer(updated)
    }
  }, [selectedCustomer?.id, getCustomer])

  // Clear selection
  const clearCustomer = useCallback(() => {
    setSelectedCustomer(null)
  }, [])

  // Select customer by ID
  const selectCustomerById = useCallback(async (customerId: string) => {
    const customer = await getCustomer(customerId)
    if (customer) {
      setSelectedCustomer(customer)
    }
    return customer
  }, [getCustomer])

  return {
    selectedCustomer,
    setSelectedCustomer,
    refreshCustomer,
    clearCustomer,
    selectCustomerById,
    hasCustomer: !!selectedCustomer,
    isWalkIn: selectedCustomer ? 
      selectedCustomer.firstName === 'Walk-in' && selectedCustomer.lastName === 'Customer' : 
      false
  }
}