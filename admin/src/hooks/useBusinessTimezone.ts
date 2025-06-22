import { useState, useEffect } from 'react';

interface BusinessTimezone {
  timezone: string | null;
  loading: boolean;
  error: string | null;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  parseToBusinessDate: (dateString: string) => Date;
  getBusinessDateString: (date: Date) => string;
}

export const useBusinessTimezone = (): BusinessTimezone => {
  const [timezone, setTimezone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const response = await fetch('/api/settings/store-info');
        if (response.ok) {
          const data = await response.json();
          setTimezone(data.timezone || 'America/Vancouver'); // Fallback for existing data
        } else {
          setError('Failed to fetch store settings');
        }
      } catch (err) {
        setError('Network error occurred');
        console.error('Error fetching timezone:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimezone();
  }, []);

  const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    if (!timezone) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Validate date object
    if (!dateObj || isNaN(dateObj.getTime())) {
      console.warn('Invalid date passed to formatDate:', date);
      return typeof date === 'string' ? date : '';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options
    };

    try {
      return new Intl.DateTimeFormat('en-CA', defaultOptions).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return typeof date === 'string' ? date : dateObj.toLocaleDateString();
    }
  };

  const parseToBusinessDate = (dateString: string): Date => {
    if (!timezone) return new Date(dateString);
    
    // Parse date string (YYYY-MM-DD) in business timezone
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Create date in business timezone (avoids UTC conversion)
    return new Date(year, month - 1, day);
  };

  const getBusinessDateString = (date: Date): string => {
    if (!timezone || !date || isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    
    // Format date as YYYY-MM-DD in business timezone
    const formatted = formatDate(date, {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    });
    
    // Return formatted date or fallback
    if (formatted && formatted.includes('-')) {
      return formatted;
    }
    
    return date.toISOString().split('T')[0];
  };

  return {
    timezone,
    loading,
    error,
    formatDate,
    parseToBusinessDate,
    getBusinessDateString
  };
};