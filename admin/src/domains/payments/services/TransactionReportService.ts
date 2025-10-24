import { ApiService } from '@shared/infrastructure/api/ApiService';
import type {
  TransactionReportFilters,
  TransactionReportResponse
} from '../types/transactionReports';

const BASE_ENDPOINT = '/api/payment-transactions';

const buildQueryString = (filters?: TransactionReportFilters): string => {
  if (!filters) return '';

  const params = new URLSearchParams();

  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.status) params.set('status', filters.status);
  if (filters.provider) params.set('provider', filters.provider);
  if (filters.channel) params.set('channel', filters.channel);
  if (filters.search) params.set('search', filters.search);
  if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
  if (typeof filters.page === 'number') params.set('page', String(filters.page));
  if (typeof filters.limit === 'number') params.set('limit', String(filters.limit));

  const query = params.toString();
  return query ? `?${query}` : '';
};

export class TransactionReportService {
  static async getTransactions(filters: TransactionReportFilters): Promise<TransactionReportResponse> {
    const query = buildQueryString(filters);
    const result = await ApiService.get<TransactionReportResponse>(`${BASE_ENDPOINT}${query}`);

    if (result.success) {
      return result.data;
    }

    if ('error' in result && result.error) {
      throw result.error;
    }

    throw new Error('Failed to fetch transactions');
  }

  static async exportTransactions(filters: TransactionReportFilters): Promise<Blob> {
    const { page, limit, ...exportFilters } = filters;
    const query = buildQueryString(exportFilters);

    const response = await fetch(`${BASE_ENDPOINT}/export${query}`, {
      method: 'GET'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to export transactions');
    }

    return await response.blob();
  }
}
