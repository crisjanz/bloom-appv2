import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';

export interface DashboardMetrics {
  todayRevenue: {
    amount: number;
    percentChange: number;
  };
  ordersPending: {
    count: number;
    overdue: number;
  };
  deliveriesToday: {
    total: number;
    byStatus: {
      DELIVERED: number;
      OUT_FOR_DELIVERY: number;
      PREPARING: number;
    };
  };
  newCustomers: {
    thisWeek: number;
    percentChange: number;
  };
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

export function useDashboardMetrics() {
  const apiClient = useApiClient();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/dashboard/metrics');
      const data = response.data as DashboardMetrics;
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchMetrics();

    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return { metrics, loading, error, refresh: fetchMetrics };
}

export function useRevenueTrend(days: number = 7) {
  const apiClient = useApiClient();
  const [data, setData] = useState<RevenueTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrend = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/api/dashboard/revenue-trend?days=${days}`);
        const trendData = response.data as RevenueTrendPoint[];
        setData(trendData);
      } catch (err) {
        console.error('Failed to load revenue trend:', err);
        setError('Failed to load trend');
      } finally {
        setLoading(false);
      }
    };

    fetchTrend();
  }, [apiClient, days]);

  return { data, loading, error };
}
