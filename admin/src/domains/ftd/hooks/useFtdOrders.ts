import { useState, useEffect } from 'react';
import { FtdOrder, FtdOrderStats } from '../types/ftdTypes';

export function useFtdOrders(filters?: {
  status?: string;
  from?: string;
  to?: string;
  sendingFlorist?: string;
}) {
  const [orders, setOrders] = useState<FtdOrder[]>([]);
  const [stats, setStats] = useState<FtdOrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.from) params.append('from', filters.from);
      if (filters?.to) params.append('to', filters.to);
      if (filters?.sendingFlorist) params.append('sendingFlorist', filters.sendingFlorist);

      const res = await fetch(`/api/ftd/orders?${params}`);
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders);
      } else {
        setError(data.error || 'Failed to fetch orders');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/ftd/orders/stats/summary');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const updateOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ftd/orders/update', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Update failed:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();

    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
      fetchOrders();
      fetchStats();
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [filters?.status, filters?.from, filters?.to, filters?.sendingFlorist]);

  return {
    orders,
    stats,
    loading,
    error,
    refresh: fetchOrders,
    updateOrder,
  };
}
