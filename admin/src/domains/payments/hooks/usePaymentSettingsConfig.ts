import { useCallback, useEffect, useState } from 'react';
import type {
  OfflinePaymentMethod,
  PaymentSettingsResponse,
  PaymentsPagePayload
} from '@app/components/settings/payments/types';

interface UsePaymentSettingsConfigOptions {
  autoLoad?: boolean;
}

interface UsePaymentSettingsConfigResult {
  settings: PaymentSettingsResponse | null;
  offlineMethods: OfflinePaymentMethod[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const usePaymentSettingsConfig = (
  options: UsePaymentSettingsConfigOptions = {}
): UsePaymentSettingsConfigResult => {
const { autoLoad = true } = options;
  const [settings, setSettings] = useState<PaymentSettingsResponse | null>(null);
  const [offlineMethods, setOfflineMethods] = useState<OfflinePaymentMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/settings/payments');
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load payment settings');
      }

      const data: PaymentsPagePayload = await response.json();
      const { offlineMethods: offlineList, ...settingsData } = data;
      setSettings(settingsData);
      setOfflineMethods(offlineList ?? []);
    } catch (err) {
      console.error('Failed to load payment settings config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    load();
  }, [autoLoad, load]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      load();
    };
    window.addEventListener('payment-settings:updated', handler);
    return () => {
      window.removeEventListener('payment-settings:updated', handler);
    };
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return {
    settings,
    offlineMethods,
    loading,
    error,
    refresh
  };
};

export default usePaymentSettingsConfig;
