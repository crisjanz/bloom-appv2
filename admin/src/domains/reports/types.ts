/**
 * Reporting domain types
 * Matches the backend /api/reports responses
 */

export interface SalesSummary {
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  totalTax: number;
  totalDeliveryFees: number;
  totalDiscounts: number;
}

export interface DailySalesPoint {
  date: string;
  amount: number;
  orders: number;
}

export interface BreakdownTotals {
  [key: string]: {
    count: number;
    amount: number;
  };
}

export interface SalesSummaryResponse {
  success: boolean;
  summary: SalesSummary;
  dailySales: DailySalesPoint[];
  paymentBreakdown: BreakdownTotals;
  sourceBreakdown: BreakdownTotals;
}

export interface SalesOrderItem {
  id: string;
  customName: string;
  unitPrice: number;
  quantity: number;
  rowTotal: number;
}

export interface SalesOrderCustomer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone?: string | null;
}

export interface SalesOrderPaymentMethod {
  key: string;
  type: string;
  provider: string | null;
  amount: number;
  displayName: string;
}

export interface SalesOrder {
  id: string;
  orderNumber: number;
  createdAt: string;
  status: string;
  paymentAmount: number;
  orderSource: string | null;
  deliveryFee: number;
  discount: number;
  totalTax: number;
  taxBreakdown?: Array<{
    name: string;
    amount: number;
  }>;
  paymentMethods: SalesOrderPaymentMethod[];
  paymentSummary: string;
  customer: SalesOrderCustomer | null;
  orderItems: SalesOrderItem[];
}

export interface SalesOrdersResponse {
  success: boolean;
  orders: SalesOrder[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface SalesReportFilters {
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  status?: string;
  orderSource?: string;
  limit?: number;
  offset?: number;
}

export interface TaxExportRow {
  orderNumber: number;
  date: string;
  customerName: string;
  subtotal: string;
  gst: string;
  pst: string;
  totalTax: string;
  total: string;
  paymentMethod: string;
  orderSource: string | null;
  status: string;
}

export interface TaxExportTotals {
  subtotal: string;
  gst: string;
  pst: string;
  totalTax: string;
  total: string;
}

export interface TaxExportResponse {
  success: boolean;
  data: TaxExportRow[];
  totals: TaxExportTotals;
  period: {
    start: string;
    end: string;
  };
  generatedAt: string;
}
