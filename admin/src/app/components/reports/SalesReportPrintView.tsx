import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type {
  SalesSummaryResponse,
  SalesOrder,
  SalesReportFilters
} from '@domains/reports/types';
import type { OrderStatus } from '@shared/utils/orderStatusHelpers';
import { formatPaymentMethodKeyLabel, summarizePaymentMethods } from '@app/components/reports/paymentUtils';

const formatCurrencyFromCents = (amount?: number, emptyValue = '$0.00') => {
  if (amount === undefined || amount === null) {
    return emptyValue;
  }

  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount / 100);
};

const formatDateRange = (filters: SalesReportFilters) => {
  const { startDate, endDate } = filters;

  if (startDate && endDate) {
    return `${startDate} → ${endDate}`;
  }

  if (startDate) {
    return `From ${startDate}`;
  }

  if (endDate) {
    return `Through ${endDate}`;
  }

  return 'All Dates';
};

const formatLabel = (value?: string | null) => {
  if (!value || value === 'UNKNOWN') {
    return 'Unknown';
  }

  if (value === 'ALL') {
    return 'All';
  }

  return value
    .split(/[_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

interface SalesReportPrintViewProps {
  summary: SalesSummaryResponse | null;
  orders: SalesOrder[];
  filters: SalesReportFilters;
  generatedAt?: string;
}

const SalesReportPrintView: React.FC<SalesReportPrintViewProps> = ({
  summary,
  orders,
  filters,
  generatedAt = new Date().toISOString()
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (typeof document === 'undefined') {
    return null;
  }

  if (!containerRef.current) {
    const el = document.createElement('div');
    el.className = 'print-container';
    containerRef.current = el;
  }

  useEffect(() => {
    const el = containerRef.current!;
    document.body.appendChild(el);

    return () => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    };
  }, []);

  const summaryData = summary?.summary;

  const totalSales = summaryData?.totalSales ?? 0;
  const totalOrders = summaryData?.orderCount ?? 0;
  const averageOrderValue = summaryData?.averageOrderValue ?? 0;
  const totalTax = summaryData?.totalTax ?? 0;
  const totalDeliveryFees = summaryData?.totalDeliveryFees ?? 0;
  const totalDiscounts = summaryData?.totalDiscounts ?? 0;

  const taxTotals = orders.reduce(
    (acc, order) => {
      if (Array.isArray(order.taxBreakdown)) {
        order.taxBreakdown.forEach((tax) => {
          const name = (tax.name || '').toUpperCase();
          if (name.includes('GST')) {
            acc.gst += tax.amount || 0;
          } else if (name.includes('PST') || name.includes('RST')) {
            acc.pst += tax.amount || 0;
          } else {
            acc.other += tax.amount || 0;
          }
        });
      } else if (typeof order.totalTax === 'number') {
        acc.other += order.totalTax;
      }
      return acc;
    },
    { gst: 0, pst: 0, other: 0 }
  );

  // If no per-order breakdown, fall back to overall total tax
  if (taxTotals.gst === 0 && taxTotals.pst === 0 && taxTotals.other === 0 && totalTax > 0) {
    taxTotals.other = totalTax;
  }

  const subtotalTotal = totalSales - totalTax;

  const breakdownEntries = summary?.paymentBreakdown ?? {};
  const sourceEntries = summary?.sourceBreakdown ?? {};

  return createPortal(
    <div className="print-report mx-auto max-w-4xl px-6 py-8 text-gray-900">
      <header className="mb-6 border-b border-gray-300 pb-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold uppercase tracking-wide">Bloom Sales Report</h1>
          <div className="text-right text-[11px] leading-tight text-gray-600">
            <p>Reporting Period: {formatDateRange(filters)}</p>
            <p>Generated: {new Date(generatedAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-gray-600">
          {filters.paymentMethod && filters.paymentMethod !== 'ALL' && (
            <span className="rounded border border-gray-300 px-2 py-[2px]">
              Payment: {formatPaymentMethodKeyLabel(filters.paymentMethod)}
            </span>
          )}
          {filters.status && (
            <span className="rounded border border-gray-300 px-2 py-[2px]">
              Status: {formatLabel(filters.status)}
            </span>
          )}
          {filters.orderSource && (
            <span className="rounded border border-gray-300 px-2 py-[2px]">
              Source: {formatLabel(filters.orderSource)}
            </span>
          )}
        </div>
      </header>

      <section className="mb-6">
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <table className="w-full border border-gray-300">
            <tbody>
              <tr className="border-b border-gray-300">
                <th className="bg-gray-100 px-3 py-1 text-left uppercase tracking-wide">Total Sales</th>
                <td className="px-3 py-1 text-right font-semibold">
                  {formatCurrencyFromCents(totalSales)}
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-1 text-left uppercase tracking-wide">Subtotal</th>
                <td className="px-3 py-1 text-right">{formatCurrencyFromCents(subtotalTotal)}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-1 text-left uppercase tracking-wide">Orders</th>
                <td className="px-3 py-1 text-right">{totalOrders}</td>
              </tr>
              <tr>
                <th className="px-3 py-1 text-left uppercase tracking-wide">Avg Order Value</th>
                <td className="px-3 py-1 text-right">
                  {formatCurrencyFromCents(averageOrderValue)}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border border-gray-300">
            <tbody>
              <tr className="border-b border-gray-300">
                <th className="bg-gray-100 px-3 py-1 text-left uppercase tracking-wide">GST</th>
                <td className="px-3 py-1 text-right">{formatCurrencyFromCents(taxTotals.gst)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <th className="bg-gray-100 px-3 py-1 text-left uppercase tracking-wide">PST</th>
                <td className="px-3 py-1 text-right">{formatCurrencyFromCents(taxTotals.pst)}</td>
              </tr>
              {taxTotals.other > 0 && (
                <tr className="border-b border-gray-300">
                  <th className="bg-gray-100 px-3 py-1 text-left uppercase tracking-wide">Other Tax</th>
                  <td className="px-3 py-1 text-right">{formatCurrencyFromCents(taxTotals.other)}</td>
                </tr>
              )}
              <tr className="border-b border-gray-200">
                <th className="px-3 py-1 text-left uppercase tracking-wide">Delivery Fees</th>
                <td className="px-3 py-1 text-right">
                  {formatCurrencyFromCents(totalDeliveryFees)}
                </td>
              </tr>
              <tr>
                <th className="px-3 py-1 text-left uppercase tracking-wide">Discounts</th>
                <td className="px-3 py-1 text-right">
                  {formatCurrencyFromCents(totalDiscounts)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {(Object.keys(breakdownEntries).length > 0 || Object.keys(sourceEntries).length > 0) && (
        <section className="mb-6 grid grid-cols-2 gap-4 text-[10px]">
          {Object.keys(breakdownEntries).length > 0 && (
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-800">
                Payment Breakdown
              </h3>
              <table className="w-full border border-gray-300">
                <thead>
                  <tr>
                    <th className="border-b border-gray-300 bg-gray-100 px-2 py-1 text-left uppercase tracking-wide">
                      Method
                    </th>
                    <th className="border-b border-gray-300 bg-gray-100 px-2 py-1 text-right uppercase tracking-wide">
                      Amount
                    </th>
                    <th className="border-b border-gray-300 bg-gray-100 px-2 py-1 text-right uppercase tracking-wide">
                      Orders
                    </th>
                  </tr>
                </thead>
                <tbody>
                    {Object.entries(breakdownEntries)
                      .sort(([, a], [, b]) => b.amount - a.amount)
                      .map(([key, value]) => (
                        <tr key={key}>
                          <td className="border-t border-gray-200 px-2 py-1">
                            {formatPaymentMethodKeyLabel(key)}
                          </td>
                          <td className="border-t border-gray-200 px-2 py-1 text-right">
                            {formatCurrencyFromCents(value.amount)}
                          </td>
                          <td className="border-t border-gray-200 px-2 py-1 text-right">{value.count}</td>
                        </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {Object.keys(sourceEntries).length > 0 && (
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-800">
                Order Source Breakdown
              </h3>
              <table className="w-full border border-gray-300">
                <thead>
                  <tr>
                    <th className="border-b border-gray-300 bg-gray-100 px-2 py-1 text-left uppercase tracking-wide">
                      Source
                    </th>
                    <th className="border-b border-gray-300 bg-gray-100 px-2 py-1 text-right uppercase tracking-wide">
                      Amount
                    </th>
                    <th className="border-b border-gray-300 bg-gray-100 px-2 py-1 text-right uppercase tracking-wide">
                      Orders
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(sourceEntries)
                    .sort(([, a], [, b]) => b.amount - a.amount)
                    .map(([key, value]) => (
                      <tr key={key}>
                        <td className="border-t border-gray-200 px-2 py-1">{formatLabel(key)}</td>
                        <td className="border-t border-gray-200 px-2 py-1 text-right">
                          {formatCurrencyFromCents(value.amount)}
                        </td>
                        <td className="border-t border-gray-200 px-2 py-1 text-right">{value.count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-800">
            Orders ({orders.length})
          </h2>
          <span className="text-[10px] text-gray-500">
            Totals shown in CAD • Rows compact for archival printing
          </span>
        </div>
        <table className="mt-2 w-full border border-gray-300 text-[10px] leading-snug">
          <thead>
            <tr>
              <th className="border-b border-gray-300 bg-gray-100 px-2 py-1 text-left uppercase tracking-wide">
                Date
              </th>
              <th className="border-b border-gray-300 bg-gray-100 px-2 py-1 text-left uppercase tracking-wide">
                Order #
              </th>
              <th className="border-b border-gray-300 bg-gray-100 px-2 py-1 text-left uppercase tracking-wide">
                Customer
              </th>
              <th className="border-b border-gray-300 bg-gray-100 px-2 py-1 text-left uppercase tracking-wide">
                Status
              </th>
              <th className="border-b border-gray-300 bg-gray-100 px-2 py-1 text-left uppercase tracking-wide">
                Payment
              </th>
              <th className="border-b border-gray-300 bg-gray-100 px-2 py-1 text-left uppercase tracking-wide">
                Source
              </th>
              <th className="border-b border-gray-300 bg-gray-100 px-2 py-1 text-right uppercase tracking-wide">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const customerName = order.customer
                ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || 'Guest'
                : 'Guest';

              const status = order.status as OrderStatus;

              return (
                <tr key={order.id}>
                  <td className="border-t border-gray-200 px-2 py-1 whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="border-t border-gray-200 px-2 py-1 font-semibold whitespace-nowrap">
                    #{order.orderNumber}
                  </td>
                  <td className="border-t border-gray-200 px-2 py-1 truncate">{customerName}</td>
                  <td className="border-t border-gray-200 px-2 py-1 whitespace-nowrap">
                    {formatLabel(status)}
                  </td>
                  <td className="border-t border-gray-200 px-2 py-1 whitespace-nowrap">
                    {summarizePaymentMethods(order.paymentMethods, order.paymentSummary)}
                  </td>
                  <td className="border-t border-gray-200 px-2 py-1 whitespace-nowrap">
                    {formatLabel(order.orderSource)}
                  </td>
                  <td className="border-t border-gray-200 px-2 py-1 text-right font-semibold whitespace-nowrap">
                    {formatCurrencyFromCents(order.paymentAmount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>,
    containerRef.current!
  );
};

export default SalesReportPrintView;
