import { useCallback, useEffect, useMemo, useState } from 'react';
import { TransactionReportService } from '../services/TransactionReportService';
import type {
  PaymentTransactionReport,
  TransactionPagination,
  TransactionReportFilters,
  TransactionReportSummary
} from '../types/transactionReports';

interface UseTransactionReportOptions {
  initialFilters?: TransactionReportFilters;
  pageSize?: number;
  autoLoad?: boolean;
}

interface UpdateFilterOptions {
  resetPage?: boolean;
}

export const useTransactionReport = ({
  initialFilters,
  pageSize = 25,
  autoLoad = true
}: UseTransactionReportOptions = {}) => {
  const [filters, setFilters] = useState<TransactionReportFilters>({
    ...initialFilters
  });
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<PaymentTransactionReport[]>([]);
  const [summary, setSummary] = useState<TransactionReportSummary | null>(null);
  const [pagination, setPagination] = useState<TransactionPagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      page,
      limit: pageSize
    }),
    [filters, page, pageSize]
  );

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await TransactionReportService.getTransactions(effectiveFilters);
      setTransactions(response.transactions);
      setSummary(response.summary);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Failed to load transactions', err);
      const message =
        err instanceof Error ? err.message : 'Unable to load payment transactions';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [effectiveFilters]);

  useEffect(() => {
    if (!autoLoad) return;
    fetchTransactions();
  }, [autoLoad, fetchTransactions]);

  const updateFilters = useCallback(
    (updates: TransactionReportFilters, options: UpdateFilterOptions = { resetPage: true }) => {
      setFilters((prev) => {
        const next: TransactionReportFilters = { ...prev };

        Object.entries(updates).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') {
            delete next[key as keyof TransactionReportFilters];
          } else {
            next[key as keyof TransactionReportFilters] = value;
          }
        });

        return next;
      });

      if (options.resetPage) {
        setPage(1);
      }
    },
    []
  );

  const goToPage = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const refresh = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  const exportTransactions = useCallback(async (): Promise<Blob> => {
    setExporting(true);
    try {
      return await TransactionReportService.exportTransactions(filters);
    } finally {
      setExporting(false);
    }
  }, [filters]);

  return {
    filters,
    updateFilters,
    page,
    pageSize,
    goToPage,
    transactions,
    summary,
    pagination,
    loading,
    error,
    refresh,
    exporting,
    exportTransactions
  };
};
