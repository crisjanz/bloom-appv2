import { useMemo, useState } from 'react';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import ComponentCard from '@shared/ui/common/ComponentCard';
import Label from '@shared/ui/forms/Label';
import Select from '@shared/ui/forms/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow
} from '@shared/ui/components/ui/table';
import StatusBadge from '@app/components/orders/StatusBadge';
import ReportMetricCard from '@app/components/reports/ReportMetricCard';
import SalesTrendChart from '@app/components/reports/SalesTrendChart';
import BreakdownList from '@app/components/reports/BreakdownList';
import SalesReportPrintView from '@app/components/reports/SalesReportPrintView';
import { getMonthRange, getTodayRange, getWeekRange } from '@app/components/reports/dateUtils';
import { DEFAULT_PAYMENT_METHOD_KEYS, formatPaymentMethodKeyLabel, summarizePaymentMethods } from '@app/components/reports/paymentUtils';
import { useSalesReports } from '@domains/reports/hooks/useSalesReports';
import type { SalesOrder } from '@domains/reports/types';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import type { OrderStatus } from '@shared/utils/orderStatusHelpers';
import { formatCurrency } from '@shared/utils/currency';

type DatePreset = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

const backendStatusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PAID', label: 'Paid' },
  { value: 'IN_DESIGN', label: 'In Design' },
  { value: 'READY', label: 'Ready' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REJECTED', label: 'Rejected' }
];

const formatCurrencyFromCents = (amount?: number, emptyValue = '$0.00') => {
  if (amount === undefined || amount === null) return emptyValue;
  return formatCurrency(amount);
};

const formatLabel = (value: string) => {
  if (!value) return 'Unknown';
  if (value === 'ALL') return 'All';
  if (value === 'UNKNOWN') return 'Unknown';
  return value
    .split(/[_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const SalesReportPage: React.FC = () => {
  const defaultRange = useMemo(() => getMonthRange(), []);

  const [datePreset, setDatePreset] = useState<DatePreset>('MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>(defaultRange.start);
  const [customEndDate, setCustomEndDate] = useState<string>(defaultRange.end);

  const {
    filters,
    summary,
    summaryLoading,
    summaryError,
    orders,
    ordersLoading,
    ordersError,
    ordersResponse,
    page,
    goToPage,
    updateFilters,
    refreshAll
  } = useSalesReports({
    initialFilters: {
      startDate: defaultRange.start,
      endDate: defaultRange.end
    },
    pageSize: 25
  });

  const { formatDate, loading: timezoneLoading } = useBusinessTimezone();

  const summaryData = summary?.summary;

  const paymentOptions = useMemo(() => {
    const keys = new Set<string>();
    DEFAULT_PAYMENT_METHOD_KEYS.forEach((key) => keys.add(key));

    if (summary?.paymentBreakdown) {
      Object.keys(summary.paymentBreakdown).forEach((key) => {
        if (key) {
          keys.add(key);
        }
      });
    }

    return [
      { value: 'ALL', label: 'All Methods' },
      ...Array.from(keys)
        .filter((value) => value && value !== 'ALL')
        .map((value) => ({
          value,
          label: formatPaymentMethodKeyLabel(value)
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    ];
  }, [summary?.paymentBreakdown]);

  const sourceOptions = useMemo(() => {
    const entries = new Set<string>();
    if (summary?.sourceBreakdown) {
      Object.keys(summary.sourceBreakdown).forEach((key) => entries.add(key || 'UNKNOWN'));
    }
    return [
      { value: 'ALL', label: 'All Sources' },
      ...Array.from(entries)
        .filter((value) => value)
        .map((value) => ({
          value,
          label: formatLabel(value)
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    ];
  }, [summary?.sourceBreakdown]);

  const applyRange = (start: string, end: string) => {
    if (!start || !end) return;
    if (start > end) return;
    updateFilters({ startDate: start, endDate: end });
  };

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);

    if (preset === 'CUSTOM') {
      return;
    }

    const range =
      preset === 'TODAY'
        ? getTodayRange()
        : preset === 'WEEK'
        ? getWeekRange()
        : getMonthRange();

    setCustomStartDate(range.start);
    setCustomEndDate(range.end);
    applyRange(range.start, range.end);
  };

  const handleCustomStartChange = (value: string) => {
    if (!value) return;
    setDatePreset('CUSTOM');

    setCustomStartDate(value);
    let endDate = customEndDate;
    if (!endDate || value > endDate) {
      endDate = value;
      setCustomEndDate(value);
    }
    applyRange(value, endDate);
  };

  const handleCustomEndChange = (value: string) => {
    if (!value) return;
    setDatePreset('CUSTOM');

    setCustomEndDate(value);
    let startDate = customStartDate;
    if (!startDate || startDate > value) {
      startDate = value;
      setCustomStartDate(value);
    }
    applyRange(startDate, value);
  };

  const handlePaymentMethodChange = (value: string) => {
    updateFilters({ paymentMethod: value === 'ALL' ? undefined : value });
  };

  const handleStatusChange = (value: string) => {
    updateFilters({ status: value === 'ALL' ? undefined : value });
  };

  const handleSourceChange = (value: string) => {
    updateFilters({ orderSource: value === 'ALL' ? undefined : value });
  };

  const totalPages = useMemo(() => {
    if (!ordersResponse?.pagination) return 1;
    const { total, limit } = ordersResponse.pagination;
    if (!limit) return 1;
    return Math.max(1, Math.ceil(total / limit));
  }, [ordersResponse?.pagination]);

  const isFirstPage = page === 0;
  const isLastPage = ordersResponse?.pagination ? !ordersResponse.pagination.hasMore : true;

  const renderOrderRow = (order: SalesOrder) => {
    const createdAt = timezoneLoading ? order.createdAt : formatDate(order.createdAt, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const total = formatCurrencyFromCents(order.paymentAmount);
    const status = order.status as OrderStatus;

    return (
      <TableRow key={order.id} className="border-b border-gray-100 last:border-none dark:border-gray-700">
        <TableCell className="text-sm text-gray-600 dark:text-gray-300">{createdAt}</TableCell>
        <TableCell className="font-medium text-gray-900 dark:text-white">#{order.orderNumber}</TableCell>
        <TableCell className="text-sm text-gray-700 dark:text-gray-200">
          {order.customer
            ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || 'Guest'
            : 'Guest'}
        </TableCell>
        <TableCell>
          <StatusBadge status={status} />
        </TableCell>
        <TableCell className="text-sm text-gray-700 dark:text-gray-200">
          {summarizePaymentMethods(order.paymentMethods, 'No Payments')}
        </TableCell>
        <TableCell className="text-sm text-gray-700 dark:text-gray-200">
          {formatLabel(order.orderSource || 'Unknown')}
        </TableCell>
        <TableCell className="text-sm font-semibold text-gray-900 dark:text-white">{total}</TableCell>
        <TableCell className="text-xs text-gray-500 dark:text-gray-400">{order.orderItems.length} items</TableCell>
      </TableRow>
    );
  };

  const handlePrint = () => {
    if (typeof document === 'undefined') return;

    const body = document.body;
    const mediaQuery = window.matchMedia('print');
    let removeMediaListener: (() => void) | null = null;

    const cleanup = () => {
      body.classList.remove('print-mode');
      window.removeEventListener('afterprint', cleanup);
      if (removeMediaListener) {
        removeMediaListener();
        removeMediaListener = null;
      }
    };

    body.classList.add('print-mode');

    const mediaListener = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        cleanup();
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', mediaListener);
      removeMediaListener = () => mediaQuery.removeEventListener('change', mediaListener);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(mediaListener);
      removeMediaListener = () => mediaQuery.removeListener(mediaListener);
    }

    window.addEventListener('afterprint', cleanup);
    window.print();

    setTimeout(() => {
      if (body.classList.contains('print-mode')) {
        cleanup();
      }
    }, 2000);
  };

  return (
    <div>
      <div className="space-y-6">
        <PageBreadcrumb />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Sales Report</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Analyze order performance, track sales totals, and review payment trends.
          </p>
        </div>

        <ComponentCard title="Filters">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              {(['TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as DatePreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetChange(preset)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    datePreset === preset
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-gray-300 text-gray-700 hover:border-brand-500 hover:text-brand-500'
                  }`}
                >
                  {preset === 'TODAY'
                    ? 'Today'
                    : preset === 'WEEK'
                    ? 'Last 7 Days'
                    : preset === 'MONTH'
                    ? 'This Month'
                    : 'Custom'}
                </button>
              ))}
              <div className="flex-1" />
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-500 transition-colors hover:bg-brand-500/10"
              >
                Print Report
              </button>
              <button
                type="button"
                onClick={() => refreshAll()}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-brand-500 transition-colors hover:border-brand-500 hover:bg-brand-500/10"
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label>Date From</Label>
                <input
                  type="date"
                  value={customStartDate}
                  max={customEndDate}
                  onChange={(event) => handleCustomStartChange(event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <Label>Date To</Label>
                <input
                  type="date"
                  value={customEndDate}
                  min={customStartDate}
                  onChange={(event) => handleCustomEndChange(event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <Label>Payment Method</Label>
                <Select
                  options={paymentOptions}
                  value={filters.paymentMethod ?? 'ALL'}
                  onChange={handlePaymentMethodChange}
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  options={backendStatusOptions}
                  value={filters.status ?? 'ALL'}
                  onChange={handleStatusChange}
                />
              </div>
              <div className="space-y-1 md:col-span-2 lg:col-span-1">
                <Label>Order Source</Label>
                <Select
                  options={sourceOptions.length > 1 ? sourceOptions : [{ value: 'ALL', label: 'All Sources' }]}
                  value={filters.orderSource ?? 'ALL'}
                  onChange={handleSourceChange}
                />
              </div>
            </div>

            {(summaryError || ordersError) && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {summaryError || ordersError}
              </div>
            )}
          </div>
        </ComponentCard>

        <ComponentCard title="Key Metrics">
        {summaryLoading && !summaryData ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500" />
          </div>
        ) : summaryData ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ReportMetricCard label="Total Sales" value={formatCurrencyFromCents(summaryData.totalSales)} />
            <ReportMetricCard label="Orders" value={summaryData.orderCount.toString()} />
            <ReportMetricCard
              label="Average Order Value"
              value={formatCurrencyFromCents(summaryData.averageOrderValue, '$0.00')}
            />
            <ReportMetricCard label="Collected Tax" value={formatCurrencyFromCents(summaryData.totalTax)} />
            <ReportMetricCard label="Delivery Fees" value={formatCurrencyFromCents(summaryData.totalDeliveryFees)} />
            <ReportMetricCard label="Discounts" value={formatCurrencyFromCents(summaryData.totalDiscounts)} />
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No metrics available for the selected range.</p>
        )}
      </ComponentCard>

      <ComponentCard title="Daily Performance">
        <SalesTrendChart data={summary?.dailySales ?? []} loading={summaryLoading} />
      </ComponentCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownList title="Payment Breakdown" data={summary?.paymentBreakdown} />
        <BreakdownList title="Order Source Breakdown" data={summary?.sourceBreakdown} />
      </div>

      <ComponentCard title="Orders">
        {ordersLoading && !orders.length ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500" />
          </div>
        ) : orders.length ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Order #</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Items</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>{orders.map(renderOrderRow)}</TableBody>
              </Table>
            </div>
            {ordersResponse?.pagination && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-500 dark:text-gray-400">
                  Showing {orders.length} of {ordersResponse.pagination.total} orders
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(Math.max(0, page - 1))}
                    disabled={isFirstPage}
                    className={`rounded-lg border px-3 py-1.5 ${
                      isFirstPage
                        ? 'cursor-not-allowed border-gray-200 text-gray-400'
                        : 'border-gray-300 text-gray-700 hover:border-brand-500 hover:text-brand-500'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-gray-500 dark:text-gray-400">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={isLastPage}
                    className={`rounded-lg border px-3 py-1.5 ${
                      isLastPage
                        ? 'cursor-not-allowed border-gray-200 text-gray-400'
                        : 'border-gray-300 text-gray-700 hover:border-brand-500 hover:text-brand-500'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No orders match the selected filters. Try adjusting your date range or filters.
          </p>
        )}
      </ComponentCard>
      </div>
      <SalesReportPrintView
        summary={summary ?? null}
        orders={orders}
        filters={filters}
      />
    </div>
  );
};

export default SalesReportPage;
