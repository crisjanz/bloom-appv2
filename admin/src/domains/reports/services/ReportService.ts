import { ApiService } from '@shared/infrastructure/api/ApiService';
import type {
  SalesReportFilters,
  SalesSummaryResponse,
  SalesOrdersResponse,
  TaxExportResponse
} from '../types';

const BASE_ENDPOINT = '/api/reports';

const buildQueryString = (filters?: SalesReportFilters): string => {
  if (!filters) {
    return '';
  }

  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    // URLSearchParams expects string
    params.set(key, String(value));
  });

  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export class ReportService {
  static async getSalesSummary(
    filters?: SalesReportFilters
  ): Promise<SalesSummaryResponse> {
    const query = buildQueryString(filters);
    const result = await ApiService.get<SalesSummaryResponse>(
      `${BASE_ENDPOINT}/sales/summary${query}`
    );

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }

  static async getSalesOrders(
    filters?: SalesReportFilters
  ): Promise<SalesOrdersResponse> {
    const query = buildQueryString(filters);
    const result = await ApiService.get<SalesOrdersResponse>(
      `${BASE_ENDPOINT}/sales/orders${query}`
    );

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }

  static async getTaxExport(
    filters: Required<Pick<SalesReportFilters, 'startDate' | 'endDate'>>
  ): Promise<TaxExportResponse> {
    const query = buildQueryString(filters);
    const result = await ApiService.get<TaxExportResponse>(
      `${BASE_ENDPOINT}/tax/export${query}`
    );

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }
}
