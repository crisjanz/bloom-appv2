import { useState, useCallback, useEffect } from 'react';
import { useApiClient } from './useApiClient';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function useSubscriptionPlans() {
  const apiClient = useApiClient();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/api/subscriptions/plans/list');
      setPlans(data);
    } catch (err) {
      setError('Failed to load subscription plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = useCallback(async (planData: Partial<SubscriptionPlan>) => {
    const { data } = await apiClient.post('/api/subscriptions/plans', planData);
    setPlans((prev) => [...prev, data]);
    return data;
  }, [apiClient]);

  const updatePlan = useCallback(async (id: string, planData: Partial<SubscriptionPlan>) => {
    const { data } = await apiClient.patch(`/api/subscriptions/plans/${id}`, planData);
    setPlans((prev) => prev.map((p) => (p.id === id ? data : p)));
    return data;
  }, [apiClient]);

  const deletePlan = useCallback(async (id: string) => {
    await apiClient.delete(`/api/subscriptions/plans/${id}`);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }, [apiClient]);

  return { plans, loading, error, refresh: fetchPlans, createPlan, updatePlan, deletePlan };
}
