/**
 * React Hook for Order Search
 * Provides debounced search functionality with criteria
 */

import { useState, useEffect, useCallback } from 'react'
import { Order, OrderSearchCriteria } from '../entities/Order'
import { useOrderService } from './useOrderService'

export const useOrderSearch = (initialCriteria: OrderSearchCriteria = {}) => {
  const [criteria, setCriteria] = useState<OrderSearchCriteria>(initialCriteria)
  const [results, setResults] = useState<Order[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { searchOrders } = useOrderService()

  // Debounced search effect
  useEffect(() => {
    if (!criteria.query && Object.keys(criteria).length === 0) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      const orders = await searchOrders(criteria)
      setResults(orders)
      setIsSearching(false)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [criteria, searchOrders])

  const updateCriteria = useCallback((updates: Partial<OrderSearchCriteria>) => {
    setCriteria(prev => ({ ...prev, ...updates }))
  }, [])

  const clearSearch = useCallback(() => {
    setCriteria({})
    setResults([])
  }, [])

  return {
    criteria,
    setCriteria,
    updateCriteria,
    results,
    isSearching,
    clearSearch
  }
}
