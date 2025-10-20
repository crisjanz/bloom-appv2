/**
 * React Hook for Business Calendar
 * Fetches business hours and holidays to determine closed days
 */

import { useState, useEffect, useCallback } from 'react'
import { ApiService } from '@shared/infrastructure/api/ApiService'

export interface Holiday {
  id: string
  name: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  isOpen: boolean // false = closed, true = special hours
  openTime?: string // "10:00"
  closeTime?: string // "15:00"
  color: string
  notes?: string
}

export interface BusinessHours {
  timezone: string
  mondayEnabled: boolean
  tuesdayEnabled: boolean
  wednesdayEnabled: boolean
  thursdayEnabled: boolean
  fridayEnabled: boolean
  saturdayEnabled: boolean
  sundayEnabled: boolean
  mondayOpen?: string
  mondayClose?: string
  tuesdayOpen?: string
  tuesdayClose?: string
  wednesdayOpen?: string
  wednesdayClose?: string
  thursdayOpen?: string
  thursdayClose?: string
  fridayOpen?: string
  fridayClose?: string
  saturdayOpen?: string
  saturdayClose?: string
  sundayOpen?: string
  sundayClose?: string
}

export interface BusinessCalendarResult {
  businessHours: BusinessHours | null
  holidays: Holiday[]
  loading: boolean
  error: string | null
  isDateClosed: (date: string) => boolean // Check if specific date is closed
  getHolidayForDate: (date: string) => Holiday | undefined
}

/**
 * Check if a specific day of week is enabled in business hours
 */
const isDayOfWeekEnabled = (date: Date, businessHours: BusinessHours | null): boolean => {
  if (!businessHours) return true // Default to open if no settings

  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.

  switch (dayOfWeek) {
    case 0: return businessHours.sundayEnabled
    case 1: return businessHours.mondayEnabled
    case 2: return businessHours.tuesdayEnabled
    case 3: return businessHours.wednesdayEnabled
    case 4: return businessHours.thursdayEnabled
    case 5: return businessHours.fridayEnabled
    case 6: return businessHours.saturdayEnabled
    default: return true
  }
}

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const useBusinessCalendar = (): BusinessCalendarResult => {
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch business hours and holidays
   */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch business hours and holidays in parallel
      const [businessHoursResult, holidaysResult] = await Promise.all([
        ApiService.get<BusinessHours>('/api/settings/business-hours'),
        ApiService.get<{ holidays: Holiday[] }>('/api/settings/holidays')
      ])

      if (businessHoursResult.success && businessHoursResult.data) {
        setBusinessHours(businessHoursResult.data)
      }

      if (holidaysResult.success && holidaysResult.data) {
        setHolidays(holidaysResult.data.holidays || [])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch business calendar data'
      setError(message)
      console.error('Error fetching business calendar:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Check if a specific date is closed (either by weekly schedule or holiday)
   */
  const isDateClosed = useCallback((dateString: string): boolean => {
    const date = new Date(dateString + 'T00:00:00')

    // Check if day of week is disabled
    if (!isDayOfWeekEnabled(date, businessHours)) {
      return true
    }

    // Check if there's a closed holiday on this date
    const holiday = holidays.find(h =>
      dateString >= h.startDate &&
      dateString <= h.endDate &&
      !h.isOpen // Only closed holidays
    )

    return !!holiday
  }, [businessHours, holidays])

  /**
   * Get holiday for a specific date (if any)
   */
  const getHolidayForDate = useCallback((dateString: string): Holiday | undefined => {
    return holidays.find(h =>
      dateString >= h.startDate &&
      dateString <= h.endDate
    )
  }, [holidays])

  // Fetch on mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    businessHours,
    holidays,
    loading,
    error,
    isDateClosed,
    getHolidayForDate
  }
}
