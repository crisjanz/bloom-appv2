import { useCallback } from 'react';
import { useApiClient } from './useApiClient';

export interface HouseAccountSummary {
  customerId: string;
  customerName: string;
  email?: string | null;
  phone?: string | null;
  terms: string;
  currentBalance: number;
  lastActivity?: string | null;
}

export interface HouseAccountLedgerEntry {
  id: string;
  type: 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT';
  amount: number;
  balance: number;
  description: string;
  reference?: string | null;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: number;
  } | null;
}

export interface HouseAccountDetailResponse {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  };
  houseAccount: {
    terms: string;
    notes: string;
    currentBalance: number;
    isHouseAccount: boolean;
  };
  ledger: HouseAccountLedgerEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface HouseAccountStatement {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    terms: string;
  };
  statementPeriod: {
    from: string | null;
    to: string | null;
  };
  openingBalance: number;
  charges: Array<{
    date: string;
    orderId: string | null;
    orderNumber: number | null;
    description: string;
    reference: string | null;
    amount: number;
  }>;
  payments: Array<{
    date: string;
    reference: string | null;
    description: string;
    amount: number;
  }>;
  adjustments: Array<{
    date: string;
    description: string;
    amount: number;
  }>;
  closingBalance: number;
}

export interface HouseAccountSettings {
  terms: string;
  notes: string;
  isHouseAccount: boolean;
}

const getErrorMessage = (data: any, fallback: string) => {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  if ('message' in data && data.message) {
    return String(data.message);
  }

  if ('error' in data) {
    const errorValue = (data as any).error;
    if (typeof errorValue === 'string') {
      return errorValue;
    }

    if (Array.isArray(errorValue)) {
      const details = errorValue
        .map((item) => item?.message)
        .filter(Boolean);
      if (details.length > 0) {
        return details.join(', ');
      }
    }
  }

  return fallback;
};

const ensureResponse = <T,>(status: number, data: any, fallback: string): T => {
  if (status >= 400) {
    throw new Error(getErrorMessage(data, fallback));
  }
  return data as T;
};

const buildQueryString = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, value);
    }
  });

  return search.toString();
};

export function useHouseAccounts() {
  const apiClient = useApiClient();

  const listAccounts = useCallback(
    async (options?: { hasBalance?: boolean }) => {
      const query = options?.hasBalance ? '?hasBalance=true' : '';
      const { data, status } = await apiClient.get(`/api/house-accounts${query}`);
      const parsed = ensureResponse<{ accounts: HouseAccountSummary[] }>(
        status,
        data,
        'Failed to load house accounts'
      );
      return parsed.accounts || [];
    },
    [apiClient]
  );

  const getAccountDetail = useCallback(
    async (customerId: string, options?: { from?: string; to?: string; page?: number; pageSize?: number }) => {
      const query = buildQueryString({
        from: options?.from,
        to: options?.to,
        page: options?.page ? String(options.page) : undefined,
        pageSize: options?.pageSize ? String(options.pageSize) : undefined,
      });
      const { data, status } = await apiClient.get(
        `/api/house-accounts/${customerId}${query ? `?${query}` : ''}`
      );
      return ensureResponse<HouseAccountDetailResponse>(
        status,
        data,
        'Failed to load house account'
      );
    },
    [apiClient]
  );

  const updateSettings = useCallback(
    async (customerId: string, payload: { terms?: string; notes?: string | null }) => {
      const { data, status } = await apiClient.put(`/api/house-accounts/${customerId}`, payload);
      return ensureResponse<HouseAccountSettings>(status, data, 'Failed to update house account');
    },
    [apiClient]
  );

  const enableAccount = useCallback(
    async (customerId: string) => {
      const { data, status } = await apiClient.post(`/api/house-accounts/${customerId}/enable`);
      return ensureResponse<{ id: string; isHouseAccount: boolean }>(
        status,
        data,
        'Failed to enable house account'
      );
    },
    [apiClient]
  );

  const disableAccount = useCallback(
    async (customerId: string) => {
      const { data, status } = await apiClient.post(`/api/house-accounts/${customerId}/disable`);
      return ensureResponse<{ id: string; isHouseAccount: boolean }>(
        status,
        data,
        'Failed to disable house account'
      );
    },
    [apiClient]
  );

  const applyPayment = useCallback(
    async (customerId: string, payload: { amount: number; reference?: string; notes?: string }) => {
      const { data, status } = await apiClient.post(`/api/house-accounts/${customerId}/payments`, payload);
      return ensureResponse<{ entry: HouseAccountLedgerEntry }>(
        status,
        data,
        'Failed to apply payment'
      );
    },
    [apiClient]
  );

  const addAdjustment = useCallback(
    async (customerId: string, payload: { amount: number; description: string }) => {
      const { data, status } = await apiClient.post(`/api/house-accounts/${customerId}/adjustments`, payload);
      return ensureResponse<{ entry: HouseAccountLedgerEntry }>(
        status,
        data,
        'Failed to add adjustment'
      );
    },
    [apiClient]
  );

  const getStatement = useCallback(
    async (customerId: string, options?: { from?: string; to?: string }) => {
      const query = buildQueryString({
        from: options?.from,
        to: options?.to,
      });
      const { data, status } = await apiClient.get(
        `/api/house-accounts/${customerId}/statement${query ? `?${query}` : ''}`
      );
      return ensureResponse<HouseAccountStatement>(
        status,
        data,
        'Failed to load statement'
      );
    },
    [apiClient]
  );

  return {
    listAccounts,
    getAccountDetail,
    updateSettings,
    enableAccount,
    disableAccount,
    applyPayment,
    addAdjustment,
    getStatement,
  };
}

export default useHouseAccounts;
