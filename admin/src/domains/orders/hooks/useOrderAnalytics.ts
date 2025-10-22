/**
 * React Hook for Order Analytics
 * Provides order statistics and analytics data
 */

import { useState, useEffect, useCallback } from 'react'
import { OrderStats } from '../entities/Order'
import { useOrderService } from './useOrderService'

export const useOrderAnalytics = () => {
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(false)
  const { orderService } = useOrderService()

  const loadStats = useCallback(async (dateFrom?: Date, dateTo?: Date) => {
    setLoading(true)
    try {
      const orderStats = await orderService.getOrderStats(dateFrom, dateTo)
      setStats(orderStats)
    } catch (err) {
      console.error('Error loading order statistics:', err)
    } finally {
      setLoading(false)
    }
  }, [orderService])

  // Load stats on mount (default to last 30 days)
  useEffect(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    loadStats(thirtyDaysAgo, new Date())
  }, [loadStats])

  return {
    stats,
    loading,
    loadStats
  }
}
