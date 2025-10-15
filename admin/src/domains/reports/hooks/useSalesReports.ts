import { useState, useCallback, useEffect, useMemo } from 'react';
import { ReportService } from '../services/ReportService';
import type {
  SalesSummaryResponse,
  SalesOrdersResponse,
  SalesReportFilters,
  SalesOrder
} from '../types';

const DEFAULT_PAGE_SIZE = 25;

interface UseSalesReportsOptions {
  initialFilters?: SalesReportFilters;
  pageSize?: number;
  autoLoad?: boolean;
}

export const useSalesReports = ({
  initialFilters,
  pageSize = DEFAULT_PAGE_SIZE,
  autoLoad = true
}: UseSalesReportsOptions = {}) => {
  const [filters, setFilters] = useState<SalesReportFilters>({
    ...initialFilters
  });
  const [page, setPage] = useState(0);

  const [summary, setSummary] = useState<SalesSummaryResponse | null>(null);
  const [ordersResponse, setOrdersResponse] = useState<SalesOrdersResponse | null>(null);
  const [orders, setOrders] = useState<SalesOrder[]>([]);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const mergedFilters = useMemo(
    () => ({
      ...filters,
      limit: pageSize,
      offset: page * pageSize
    }),
    [filters, page, pageSize]
  );

  const refreshSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const response = await ReportService.getSalesSummary(filters);
      setSummary(response);
    } catch (error) {
      console.error('Failed to load sales summary', error);
      const message = error instanceof Error ? error.message : 'Unable to load sales summary';
      setSummaryError(message);
    } finally {
      setSummaryLoading(false);
    }
  }, [filters]);

  const refreshOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError(null);

    try {
      const response = await ReportService.getSalesOrders(mergedFilters);
      setOrdersResponse(response);
      setOrders(response.orders);
    } catch (error) {
      console.error('Failed to load sales orders', error);
      const message = error instanceof Error ? error.message : 'Unable to load sales orders';
      setOrdersError(message);
    } finally {
      setOrdersLoading(false);
    }
  }, [mergedFilters]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshSummary(), refreshOrders()]);
  }, [refreshSummary, refreshOrders]);

  const updateFilters = useCallback(
    (updates: SalesReportFilters, options: { resetPage?: boolean } = { resetPage: true }) => {
      setFilters((prev) => {
        const next = { ...prev };

        Object.entries(updates).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') {
            delete (next as Record<string, unknown>)[key];
          } else {
            (next as Record<string, unknown>)[key] = value;
          }
        });

        return next;
      });

      if (options.resetPage) {
        setPage(0);
      }
    },
    []
  );

  const goToPage = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    refreshSummary();
  }, [autoLoad, refreshSummary]);

  useEffect(() => {
    if (!autoLoad) return;
    refreshOrders();
  }, [autoLoad, refreshOrders]);

  return {
    filters,
    updateFilters,
    page,
    pageSize,
    goToPage,
    summary,
    orders,
    ordersResponse,
    summaryLoading,
    ordersLoading,
    summaryError,
    ordersError,
    refreshSummary,
    refreshOrders,
    refreshAll
  };
};
