import { useState, useCallback, useEffect } from 'react';
import { ReportService } from '../services/ReportService';
import type { SalesReportFilters, TaxExportResponse } from '../types';

type DateRange = Required<Pick<SalesReportFilters, 'startDate' | 'endDate'>>;

interface UseTaxExportOptions {
  initialRange?: DateRange;
  autoLoad?: boolean;
}

export const useTaxExport = ({ initialRange, autoLoad = false }: UseTaxExportOptions = {}) => {
  const [data, setData] = useState<TaxExportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange | undefined>(initialRange);

  const fetchTaxExport = useCallback(
    async (nextRange: DateRange) => {
      setLoading(true);
      setError(null);

      try {
        const response = await ReportService.getTaxExport(nextRange);
        setData(response);
        setRange(nextRange);
      } catch (err) {
        console.error('Failed to load tax export', err);
        const message = err instanceof Error ? err.message : 'Unable to load tax export data';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!range) return;
    await fetchTaxExport(range);
  }, [range, fetchTaxExport]);

  const initialStart = initialRange?.startDate;
  const initialEnd = initialRange?.endDate;

  useEffect(() => {
    if (!autoLoad || !initialStart || !initialEnd) return;
    fetchTaxExport({ startDate: initialStart, endDate: initialEnd });
  }, [autoLoad, initialStart, initialEnd, fetchTaxExport]);

  return {
    data,
    loading,
    error,
    fetchTaxExport,
    refresh,
    currentRange: range
  };
};
