import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';

export interface RouteStop {
  id: string;
  sequence: number;
  status: string;
  order: {
    id: string;
    orderNumber: number;
    recipientCustomer: { firstName: string; lastName: string };
    deliveryAddress: { address1: string; city: string };
  };
}

export interface Route {
  id: string;
  routeNumber: number;
  name: string | null;
  date: string;
  status: string;
  driver: { id: string; name: string; phone?: string | null } | null;
  stops: RouteStop[];
}

const ensureResponse = <T,>(status: number, data: any, fallbackMessage: string): T => {
  if (status >= 400) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as any).error)
        : fallbackMessage;
    throw new Error(message);
  }

  return data as T;
};

export function useRoutes(date?: string) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiClient = useApiClient();

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      const { data, status } = await apiClient.get(`/api/routes${query}`);
      const parsed = ensureResponse<{ routes: Route[] }>(status, data, 'Failed to load routes');
      setRoutes(parsed.routes || []);
    } catch (err: any) {
      console.error('Failed to fetch routes:', err);
      setError(err?.message ?? 'Failed to load routes');
    } finally {
      setLoading(false);
    }
  }, [apiClient, date]);

  const createRoute = useCallback(
    async (payload: { name?: string; date: string; driverId?: string; orderIds: string[]; notes?: string }) => {
      const { data, status } = await apiClient.post('/api/routes', payload);
      const created = ensureResponse<Route>(status, data, 'Failed to create route');
      setRoutes((prev) => [...prev, created]);
      return created;
    },
    [apiClient]
  );

  const resequenceStops = useCallback(
    async (routeId: string, stopIds: string[]) => {
      const { data, status } = await apiClient.put(`/api/routes/${routeId}/resequence`, { stopIds });
      const updated = ensureResponse<Route>(status, data, 'Failed to resequence stops');
      setRoutes((prev) => prev.map((route) => (route.id === routeId ? updated : route)));
      return updated;
    },
    [apiClient]
  );

  const updateRoute = useCallback(
    async (routeId: string, payload: { name?: string | null; driverId?: string | null; notes?: string | null }) => {
      const { data, status } = await apiClient.patch(`/api/routes/${routeId}`, payload);
      const updated = ensureResponse<Route>(status, data, 'Failed to update route');
      setRoutes((prev) => prev.map((route) => (route.id === routeId ? updated : route)));
      return updated;
    },
    [apiClient]
  );

  const deleteRoute = useCallback(
    async (routeId: string) => {
      const { data, status } = await apiClient.delete(`/api/routes/${routeId}`);
      ensureResponse(status, data, 'Failed to delete route');
      setRoutes((prev) => prev.filter((route) => route.id !== routeId));
    },
    [apiClient]
  );

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  return {
    routes,
    loading,
    error,
    refresh: fetchRoutes,
    createRoute,
    resequenceStops,
    updateRoute,
    deleteRoute
  };
}

export default useRoutes;
