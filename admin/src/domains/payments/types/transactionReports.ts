export type PaymentChannel = 'POS' | 'PHONE' | 'WEBSITE';

export interface TransactionReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  provider?: string;
  channel?: string;
  search?: string;
  paymentMethod?: string;
  page?: number;
  limit?: number;
}

export interface PaymentTransactionReport {
  id: string;
  transactionNumber: string;
  status: string;
  channel: PaymentChannel;
  totalAmount: number;
  taxAmount: number;
  tipAmount: number;
  notes?: string | null;
  createdAt: string;
  completedAt?: string | null;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  employee: {
    id: string;
    name: string;
  } | null;
  paymentMethods: Array<{
    id: string;
    type: string;
    provider: string;
    amount: number;
    cardLast4?: string | null;
    cardBrand?: string | null;
    giftCardNumber?: string | null;
    checkNumber?: string | null;
    offlineMethod?: {
      id: string;
      name: string;
      code: string;
    } | null;
    providerMetadata?: Record<string, any> | null;
  }>;
  orderPayments: Array<{
    id: string;
    amount: number;
    orderId: string;
    order: {
      id: string;
      orderNumber: number | null;
      status?: string | null;
    } | null;
  }>;
  refunds: Array<{
    id: string;
    amount: number;
  }>;
}

export interface TransactionReportSummary {
  totalCount: number;
  totalAmount: number;
  totalTax: number;
  totalTips: number;
  totalRefunded: number;
  netAmount: number;
  averageAmount: number;
  statusBreakdown: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  providerBreakdown: Array<{
    key: string;
    type: string;
    provider: string | null;
    label: string;
    count: number;
    amount: number;
  }>;
  channelBreakdown: Array<{
    channel: string;
    count: number;
    amount: number;
  }>;
}

export interface TransactionPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface TransactionReportResponse {
  transactions: PaymentTransactionReport[];
  pagination: TransactionPagination;
  summary: TransactionReportSummary;
}
