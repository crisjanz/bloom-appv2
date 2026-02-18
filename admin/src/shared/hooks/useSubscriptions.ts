import { useState, useCallback, useEffect } from 'react';
import { useApiClient } from './useApiClient';

export interface SubscriptionDelivery {
  id: string;
  subscriptionId: string;
  productId: string | null;
  productName: string | null;
  product: { id: string; name: string; images: string[] } | null;
  priceCents: number;
  scheduledDate: string;
  deliveredDate: string | null;
  status: string;
  orderId: string | null;
  order: { id: string; orderNumber: number; status: string } | null;
  customNotes: string | null;
  stripePaymentIntentId: string | null;
  paidAt: string | null;
  paymentFailed: boolean;
  rescheduleCount: number;
  createdAt: string;
}

export interface Subscription {
  id: string;
  subscriptionNumber: string;
  billingType: 'RECURRING' | 'PREPAID';
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';
  style: 'DESIGNERS_CHOICE' | 'PICK_YOUR_OWN';
  planId: string | null;
  plan: { id: string; name: string; priceCents: number } | null;
  colorPalette: string | null;
  defaultPriceCents: number;
  totalPrepaidCents: number | null;
  totalDeliveries: number | null;
  completedDeliveries: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  preferredDayOfWeek: number | null;
  customDates: string[];
  startDate: string;
  stripeCustomerId: string | null;
  stripePaymentMethodId: string | null;
  customerId: string;
  customer: { id: string; firstName: string; lastName: string; email: string | null; phone?: string | null };
  recipientName: string;
  recipientPhone: string | null;
  recipientEmail: string | null;
  recipientAddress: string;
  recipientCity: string;
  recipientProvince: string | null;
  recipientPostalCode: string;
  accessCode: string;
  notes: string | null;
  source: 'POS' | 'STOREFRONT';
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  pausedAt: string | null;
  deliveries: SubscriptionDelivery[];
}

interface SubscriptionFilters {
  status?: string;
  billingType?: string;
  style?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface PaginatedResponse {
  subscriptions: Subscription[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useSubscriptions(filters?: SubscriptionFilters) {
  const apiClient = useApiClient();
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async (overrideFilters?: SubscriptionFilters) => {
    setLoading(true);
    setError(null);
    try {
      const f = overrideFilters || filters || {};
      const params = new URLSearchParams();
      if (f.status && f.status !== 'all') params.set('status', f.status);
      if (f.billingType && f.billingType !== 'all') params.set('billingType', f.billingType);
      if (f.style && f.style !== 'all') params.set('style', f.style);
      if (f.search) params.set('search', f.search);
      if (f.page) params.set('page', String(f.page));
      if (f.limit) params.set('limit', String(f.limit));

      const { data: result } = await apiClient.get(`/api/subscriptions?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError('Failed to load subscriptions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiClient, filters]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return {
    subscriptions: data?.subscriptions || [],
    pagination: data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    loading,
    error,
    refresh: fetchSubscriptions,
  };
}

export function useSubscription(id: string | undefined) {
  const apiClient = useApiClient();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/api/subscriptions/${id}`);
      setSubscription(data);
    } catch (err) {
      setError('Failed to load subscription');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiClient, id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const pauseSubscription = useCallback(async () => {
    if (!id) return;
    const { data } = await apiClient.post(`/api/subscriptions/${id}/pause`);
    setSubscription((prev) => prev ? { ...prev, ...data } : prev);
    return data;
  }, [apiClient, id]);

  const resumeSubscription = useCallback(async () => {
    if (!id) return;
    const { data } = await apiClient.post(`/api/subscriptions/${id}/resume`);
    setSubscription((prev) => prev ? { ...prev, ...data } : prev);
    return data;
  }, [apiClient, id]);

  const cancelSubscription = useCallback(async () => {
    if (!id) return;
    const { data } = await apiClient.post(`/api/subscriptions/${id}/cancel`);
    setSubscription((prev) => prev ? { ...prev, ...data } : prev);
    return data;
  }, [apiClient, id]);

  const updateDelivery = useCallback(async (deliveryId: string, updateData: any) => {
    if (!id) return;
    const { data } = await apiClient.patch(`/api/subscriptions/${id}/deliveries/${deliveryId}`, updateData);
    setSubscription((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        deliveries: prev.deliveries.map((d) => (d.id === deliveryId ? { ...d, ...data } : d)),
      };
    });
    return data;
  }, [apiClient, id]);

  const createSubscription = useCallback(async (subData: any) => {
    const { data } = await apiClient.post('/api/subscriptions', subData);
    return data;
  }, [apiClient]);

  return {
    subscription,
    loading,
    error,
    refresh: fetchSubscription,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    updateDelivery,
    createSubscription,
  };
}
