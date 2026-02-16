import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useApiClient } from '@shared/hooks/useApiClient';

interface OrderSettingsContextValue {
  orderNumberPrefix: string;
  loading: boolean;
  refreshOrderSettings: () => Promise<void>;
  setOrderNumberPrefix: (prefix: string) => void;
}

const PREFIX_PATTERN = /^[A-Za-z0-9]{0,5}$/;

const OrderSettingsContext = createContext<OrderSettingsContextValue | undefined>(undefined);

const normalizePrefix = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!PREFIX_PATTERN.test(trimmed)) {
    return '';
  }

  return trimmed;
};

export const OrderSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const apiClient = useApiClient();
  const [orderNumberPrefix, setOrderNumberPrefixState] = useState('');
  const [loading, setLoading] = useState(true);

  const setOrderNumberPrefix = useCallback((prefix: string) => {
    setOrderNumberPrefixState(normalizePrefix(prefix));
  }, []);

  const refreshOrderSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/settings/order-settings');
      if (response.status >= 400) {
        throw new Error('Failed to load order settings');
      }

      setOrderNumberPrefixState(normalizePrefix(response.data?.orderNumberPrefix));
    } catch (error) {
      console.error('Failed to load order number prefix settings:', error);
      setOrderNumberPrefixState('');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void refreshOrderSettings();
  }, [refreshOrderSettings]);

  const contextValue = useMemo(
    () => ({
      orderNumberPrefix,
      loading,
      refreshOrderSettings,
      setOrderNumberPrefix,
    }),
    [loading, orderNumberPrefix, refreshOrderSettings, setOrderNumberPrefix]
  );

  return (
    <OrderSettingsContext.Provider value={contextValue}>
      {children}
    </OrderSettingsContext.Provider>
  );
};

export const useOrderSettings = (): OrderSettingsContextValue => {
  const context = useContext(OrderSettingsContext);
  if (!context) {
    throw new Error('useOrderSettings must be used within an OrderSettingsProvider');
  }

  return context;
};
