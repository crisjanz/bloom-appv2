import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApiClient } from './useApiClient';

export interface InventoryCategory {
  id: string;
  name: string;
  depth?: number;
}

export interface InventoryItem {
  id: string;
  variantId: string;
  productId: string;
  sku: string;
  productName: string;
  variantName: string;
  price: number;
  stockLevel: number | null;
  trackInventory: boolean;
  categoryId: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  updatedAt: string;
}

export interface InventoryFilters {
  search: string;
  categoryId: string;
  lowStockOnly: boolean;
  page: number;
  pageSize: number;
  sortBy: 'name' | 'sku' | 'stock';
  sortOrder: 'asc' | 'desc';
}

export interface InventoryPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface InventoryAdjustment {
  variantId: string;
  stockLevel?: number;
  delta?: number;
}

const DEFAULT_FILTERS: InventoryFilters = {
  search: '',
  categoryId: '',
  lowStockOnly: false,
  page: 1,
  pageSize: 25,
  sortBy: 'name',
  sortOrder: 'asc',
};

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

const buildQueryString = (filters: InventoryFilters) => {
  const params = new URLSearchParams();

  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.lowStockOnly) params.set('lowStockOnly', 'true');

  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  params.set('sortBy', filters.sortBy);
  params.set('sortOrder', filters.sortOrder);

  return params.toString();
};

export function useInventory(initialFilters?: Partial<InventoryFilters>) {
  const apiClient = useApiClient();
  const [filters, setFilters] = useState<InventoryFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [pagination, setPagination] = useState<InventoryPagination>({
    page: filters.page,
    pageSize: filters.pageSize,
    totalItems: 0,
    totalPages: 1,
  });
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInventory = useCallback(
    async (targetFilters: InventoryFilters) => {
      setLoading(true);
      setError(null);

      try {
        const query = buildQueryString(targetFilters);
        const { data, status } = await apiClient.get(`/api/inventory?${query}`);
        const parsed = ensureResponse<{
          items: InventoryItem[];
          pagination: InventoryPagination;
        }>(status, data, 'Failed to load inventory');

        setItems(Array.isArray(parsed.items) ? parsed.items : []);
        setPagination(
          parsed.pagination || {
            page: targetFilters.page,
            pageSize: targetFilters.pageSize,
            totalItems: 0,
            totalPages: 1,
          }
        );
      } catch (err: any) {
        console.error('Failed to load inventory:', err);
        setError(err?.message || 'Failed to load inventory');
      } finally {
        setLoading(false);
      }
    },
    [apiClient]
  );

  const loadCategories = useCallback(async () => {
    try {
      const { data, status } = await apiClient.get('/api/categories');
      const parsed = ensureResponse<any[]>(status, data, 'Failed to load categories');
      setCategories(
        Array.isArray(parsed)
          ? parsed.map((category) => ({
              id: category.id,
              name: category.name,
              depth: category.depth ?? 0,
            }))
          : []
      );
    } catch (err) {
      console.error('Failed to load inventory categories:', err);
    }
  }, [apiClient]);

  useEffect(() => {
    loadInventory(filters);
  }, [filters, loadInventory]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const updateFilters = useCallback((updates: Partial<InventoryFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const lookup = useCallback(
    async (sku: string) => {
      const query = encodeURIComponent(sku.trim());
      const { data, status } = await apiClient.get(`/api/inventory/lookup?sku=${query}`);
      return ensureResponse<InventoryItem>(status, data, 'Product not found');
    },
    [apiClient]
  );

  const search = useCallback(
    async (query: string, pageSize = 20) => {
      const params = new URLSearchParams({
        search: query,
        page: '1',
        pageSize: String(pageSize),
      });
      const { data, status } = await apiClient.get(`/api/inventory?${params.toString()}`);
      const parsed = ensureResponse<{ items: InventoryItem[] }>(status, data, 'Failed to search inventory');
      return parsed.items || [];
    },
    [apiClient]
  );

  const adjustStock = useCallback(
    async (variantId: string, payload: { stockLevel?: number; delta?: number }) => {
      const { data, status } = await apiClient.patch(`/api/inventory/${variantId}`, payload);
      const updated = ensureResponse<InventoryItem>(status, data, 'Failed to adjust stock');

      setItems((prev) => prev.map((item) => (item.variantId === variantId ? updated : item)));
      return updated;
    },
    [apiClient]
  );

  const bulkAdjust = useCallback(
    async (adjustments: InventoryAdjustment[]) => {
      const { data, status } = await apiClient.post('/api/inventory/bulk-adjust', {
        adjustments,
      });
      const parsed = ensureResponse<{ items: InventoryItem[] }>(
        status,
        data,
        'Failed to apply bulk adjustment'
      );

      if (parsed.items?.length) {
        const updatedMap = new Map(parsed.items.map((item) => [item.variantId, item]));
        setItems((prev) => prev.map((item) => updatedMap.get(item.variantId) || item));
      }

      return parsed.items || [];
    },
    [apiClient]
  );

  const getQrCode = useCallback(
    async (variantId: string) => {
      const { data, status } = await apiClient.get(`/api/inventory/qr/${variantId}`);
      return ensureResponse<{
        variantId: string;
        sku: string;
        qrValue: string;
        qrCode: string;
      }>(status, data, 'Failed to generate QR code');
    },
    [apiClient]
  );

  const generateReport = useCallback(
    async (options?: {
      categoryId?: string;
      lowStockOnly?: boolean;
      sortBy?: 'name' | 'sku' | 'stock';
      sortOrder?: 'asc' | 'desc';
    }) => {
      const params = new URLSearchParams();
      if (options?.categoryId) params.set('categoryId', options.categoryId);
      if (options?.lowStockOnly) params.set('lowStockOnly', 'true');
      if (options?.sortBy) params.set('sortBy', options.sortBy);
      if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

      const { data, status } = await apiClient.get(`/api/inventory/report?${params.toString()}`);
      return ensureResponse<{ pdfUrl: string }>(
        status,
        data,
        'Failed to generate inventory report'
      );
    },
    [apiClient]
  );

  const generateSingleLabel = useCallback(
    async (variantId: string, quantity = 1) => {
      const params = new URLSearchParams({ quantity: String(quantity) });
      const { data, status } = await apiClient.get(`/api/inventory/label/${variantId}?${params.toString()}`);
      return ensureResponse<{ pdfUrl: string }>(status, data, 'Failed to generate label');
    },
    [apiClient]
  );

  const generateLabels = useCallback(
    async (labels: Array<{ variantId: string; quantity: number }>) => {
      const { data, status } = await apiClient.post('/api/inventory/labels', {
        labels,
      });
      return ensureResponse<{ pdfUrl: string; labelCount: number }>(
        status,
        data,
        'Failed to generate labels'
      );
    },
    [apiClient]
  );

  const refresh = useCallback(() => loadInventory(filters), [filters, loadInventory]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(filters.search.trim() || filters.categoryId || filters.lowStockOnly);
  }, [filters.categoryId, filters.lowStockOnly, filters.search]);

  return {
    items,
    categories,
    loading,
    error,
    filters,
    pagination,
    hasActiveFilters,
    setFilters: updateFilters,
    lookup,
    search,
    adjustStock,
    bulkAdjust,
    getQrCode,
    generateReport,
    generateSingleLabel,
    generateLabels,
    refresh,
  };
}

export default useInventory;
