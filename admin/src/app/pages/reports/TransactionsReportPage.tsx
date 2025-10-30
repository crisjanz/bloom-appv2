import { useEffect, useMemo, useState } from 'react';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import ComponentCard from '@shared/ui/common/ComponentCard';
import Label from '@shared/ui/forms/Label';
import Select from '@shared/ui/forms/Select';
import InputField from '@shared/ui/forms/input/InputField';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow
} from '@shared/ui/components/ui/table';
import { getMonthRange, getTodayRange, getWeekRange } from '@app/components/reports/dateUtils';
import { useTransactionReport } from '@domains/payments/hooks/useTransactionReport';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import type { PaymentTransactionReport } from '@domains/payments/types/transactionReports';
import usePaymentSettingsConfig from '@domains/payments/hooks/usePaymentSettingsConfig';

type DatePreset = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

const statusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PARTIALLY_REFUNDED', label: 'Partially Refunded' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

const providerOptions = [
  { value: 'ALL', label: 'All Providers' },
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'SQUARE', label: 'Square' },
  { value: 'INTERNAL', label: 'In-House (Cash/Gift Card)' }
];

const channelOptions = [
  { value: 'ALL', label: 'All Channels' },
  { value: 'POS', label: 'POS' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'WEBSITE', label: 'Website' }
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format((amount || 0) / 100); // Convert cents to dollars

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const resolvePaymentMethodLabel = (method: PaymentTransactionReport['paymentMethods'][number]) => {
  const type = method.type?.toUpperCase?.() ?? '';

  if (method.offlineMethod?.name) {
    return method.offlineMethod.name;
  }

  switch (type) {
    case 'HOUSE_ACCOUNT':
      return 'House Account';
    case 'COD':
      return 'Collect on Delivery';
    case 'STORE_CREDIT':
      return 'Store Credit';
    case 'CHECK':
      return 'Cheque';
    case 'GIFT_CARD':
      return 'Gift Card';
    case 'FTD':
      return 'FTD Wire-In';
    default:
      return toTitleCase(type || 'UNKNOWN');
  }
};

const statusStyles: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  PARTIALLY_REFUNDED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  REFUNDED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PENDING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300'
};

const channelLabels: Record<string, string> = {
  POS: 'POS',
  PHONE: 'Phone',
  WEBSITE: 'Website'
};

const TransactionsReportPage: React.FC = () => {
  const defaultRange = useMemo(() => getWeekRange(), []);
  const [datePreset, setDatePreset] = useState<DatePreset>('WEEK');
  const [customStartDate, setCustomStartDate] = useState<string>(defaultRange.start);
  const [customEndDate, setCustomEndDate] = useState<string>(defaultRange.end);
  const [exportError, setExportError] = useState<string | null>(null);

  const {
    filters,
    updateFilters,
    page,
    pageSize,
    goToPage,
    transactions,
    pagination,
    loading,
    error,
    refresh,
    exporting,
    exportTransactions
  } = useTransactionReport({
    initialFilters: {
      startDate: defaultRange.start,
      endDate: defaultRange.end
    },
    pageSize: 25
  });

  const [searchInput, setSearchInput] = useState<string>(filters.search ?? '');

  useEffect(() => {
    setSearchInput(filters.search ?? '');
  }, [filters.search]);

  const { formatDate, loading: timezoneLoading } = useBusinessTimezone();
  const { settings: paymentSettings, offlineMethods: paymentOfflineMethods } = usePaymentSettingsConfig();

  const paymentMethodOptions = useMemo(() => {
    const options = [
      { value: 'ALL', label: 'All Payment Methods' },
      { value: 'CASH', label: 'Cash' },
      { value: 'CARD', label: 'Card' },
      { value: 'GIFT_CARD', label: 'Gift Card' },
    ];

    const builtIn = paymentSettings?.builtInMethods;

    if (!builtIn || builtIn.check) {
      options.push({ value: 'CHECK', label: 'Cheque' });
    }

    if (!builtIn || builtIn.houseAccount) {
      options.push({ value: 'HOUSE_ACCOUNT', label: 'House Account' });
    }

    if (!builtIn || builtIn.cod) {
      options.push({ value: 'COD', label: 'Collect on Delivery' });
    }

    // Always show FTD option (for wire-in orders)
    options.push({ value: 'FTD', label: 'FTD Wire-In' });

    const offlineOptions = (paymentOfflineMethods ?? [])
      .filter((method) => method.isActive)
      .map((method) => ({
        value: `offline:${method.id}`,
        label: method.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [...options, ...offlineOptions];
  }, [paymentSettings, paymentOfflineMethods]);

  const totalPages = useMemo(() => {
    if (!pagination) return 1;
    return Math.max(1, Math.ceil(pagination.total / pagination.limit));
  }, [pagination]);

  const isFirstPage = page <= 1;
  const isLastPage = pagination ? !pagination.hasMore : true;

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
    let end = customEndDate;
    if (!end || value > end) {
      end = value;
      setCustomEndDate(value);
    }
    applyRange(value, end);
  };

  const handleCustomEndChange = (value: string) => {
    if (!value) return;
    setDatePreset('CUSTOM');
    setCustomEndDate(value);
    let start = customStartDate;
    if (!start || start > value) {
      start = value;
      setCustomStartDate(value);
    }
    applyRange(start, value);
  };

  const handleStatusChange = (value: string) => {
    updateFilters({ status: value === 'ALL' ? undefined : value });
  };

  const handleProviderChange = (value: string) => {
    updateFilters({ provider: value === 'ALL' ? undefined : value });
  };

  const handleChannelChange = (value: string) => {
    updateFilters({ channel: value === 'ALL' ? undefined : value });
  };

  const handlePaymentMethodChange = (value: string) => {
    updateFilters({ paymentMethod: value === 'ALL' ? undefined : value });
  };

  const handleApplySearch = () => {
    const normalized = searchInput.trim();
    updateFilters({ search: normalized || undefined });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    updateFilters({ search: undefined });
  };

  const handleExport = async () => {
    setExportError(null);
    try {
      const blob = await exportTransactions();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export transactions', err);
      const message = err instanceof Error ? err.message : 'Failed to export transactions';
      setExportError(message);
    }
  };

  const renderTransactionRow = (transaction: PaymentTransactionReport) => {
    const customerName = transaction.customer
      ? [transaction.customer.firstName, transaction.customer.lastName].filter(Boolean).join(' ').trim()
      : '';

    const customerFallback =
      transaction.customer?.phone ||
      transaction.customer?.email ||
      (transaction.customer ? 'Customer Record' : 'Guest Checkout');

    const displayCustomer = customerName || customerFallback;

    const paymentMethods = transaction.paymentMethods.length
      ? transaction.paymentMethods
      : null;

    const orderNumbers = transaction.orderPayments
      .map((payment) => payment.order?.orderNumber)
      .filter((value): value is number => typeof value === 'number');

    const refundedTotal = transaction.refunds.reduce((sum, refund) => sum + refund.amount, 0);

    const dateDisplay =
      timezoneLoading && transaction.createdAt
        ? new Date(transaction.createdAt).toLocaleString()
        : formatDate(transaction.createdAt, {
            hour: '2-digit',
            minute: '2-digit'
          });

    return (
      <TableRow key={transaction.id} className="border-b border-gray-100 dark:border-gray-700/60">
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium text-gray-900 dark:text-white">{transaction.transactionNumber}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{dateDisplay}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{displayCustomer}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {transaction.customer?.email || transaction.customer?.phone || '—'}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            {(paymentMethods ?? []).map((method) => (
              <span
                key={method.id}
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700/60 dark:text-gray-200"
              >
                {resolvePaymentMethodLabel(method)}
                {method.provider && method.provider !== 'INTERNAL' ? ` (${toTitleCase(method.provider)})` : ''}
                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(method.amount)}</span>
                {(method.checkNumber || method.providerMetadata?.reference) && (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Ref: {method.checkNumber || method.providerMetadata?.reference}
                  </span>
                )}
              </span>
            ))}
            {!paymentMethods && (
              <span className="text-xs text-gray-500 dark:text-gray-400">No payment methods recorded</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {channelLabels[transaction.channel] ?? toTitleCase(transaction.channel)}
          </span>
        </TableCell>
        <TableCell>
          <span
            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusStyles[transaction.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300'}`}
          >
            {toTitleCase(transaction.status)}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatCurrency(transaction.totalAmount)}
            </span>
            {transaction.tipAmount ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Tips: {formatCurrency(transaction.tipAmount)}
              </span>
            ) : null}
            {refundedTotal ? (
              <span className="text-xs text-red-600 dark:text-red-400">
                Refunded: {formatCurrency(refundedTotal)}
              </span>
            ) : null}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1 text-right">
            {orderNumbers.length ? (
              orderNumbers.map((orderNumber) => (
                <span key={orderNumber} className="text-xs font-medium text-[#597485] dark:text-[#9ab3c3]">
                  Order #{orderNumber}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">No linked orders</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {transaction.employee?.name ?? '—'}
          </span>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Payment Transactions</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review PT-XXXX payment transactions with channel, provider, and status filters.
        </p>
      </div>

      <ComponentCard title="Filters">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            {(['TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as DatePreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetChange(preset)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  datePreset === preset
                    ? 'border-[#597485] bg-[#597485] text-white'
                    : 'border-gray-300 text-gray-700 hover:border-[#597485] hover:text-[#597485]'
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
              onClick={() => refresh()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-[#597485] transition-colors hover:border-[#597485] hover:bg-[#597485]/10"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                exporting
                  ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800'
                  : 'border-[#597485] text-[#597485] hover:bg-[#597485]/10'
              }`}
            >
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label>Date From</Label>
              <InputField
                type="date"
                value={customStartDate}
                max={customEndDate}
                onChange={(event) => handleCustomStartChange(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Date To</Label>
              <InputField
                type="date"
                value={customEndDate}
                min={customStartDate}
                onChange={(event) => handleCustomEndChange(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                options={statusOptions}
                value={filters.status ?? 'ALL'}
                onChange={handleStatusChange}
              />
            </div>
            <div className="space-y-1">
              <Label>Provider</Label>
              <Select
                options={providerOptions}
                value={filters.provider ?? 'ALL'}
                onChange={handleProviderChange}
              />
            </div>
            <div className="space-y-1">
              <Label>Channel</Label>
              <Select
                options={channelOptions}
                value={filters.channel ?? 'ALL'}
                onChange={handleChannelChange}
              />
            </div>
            <div className="space-y-1">
              <Label>Payment Method</Label>
              <Select
                options={paymentMethodOptions}
                value={filters.paymentMethod ?? 'ALL'}
                onChange={handlePaymentMethodChange}
              />
            </div>
            <div className="space-y-1 md:col-span-2 lg:col-span-1">
              <Label>Search</Label>
              <div className="flex items-center gap-2">
                <InputField
                  type="text"
                  value={searchInput}
                  placeholder="Search PT number, customer, order number…"
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleApplySearch();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleApplySearch}
                  className="rounded-lg border border-[#597485] px-3 py-2 text-sm font-medium text-[#597485] transition-colors hover:bg-[#597485]/10"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-[#597485] hover:text-[#597485]"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {(error || exportError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              {exportError || error}
            </div>
          )}
        </div>
      </ComponentCard>

      <ComponentCard title="Transactions">
        {loading && !transactions.length ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#597485]" />
          </div>
        ) : transactions.length ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Transaction</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Payment Methods</TableCell>
                    <TableCell>Channel</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Orders</TableCell>
                    <TableCell>Employee</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>{transactions.map(renderTransactionRow)}</TableBody>
              </Table>
            </div>

            {pagination && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-gray-500 dark:text-gray-400">
                  Showing {transactions.length} of {pagination.total} transactions
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(Math.max(1, page - 1))}
                    disabled={isFirstPage}
                    className={`rounded-lg border px-3 py-1.5 ${
                      isFirstPage
                        ? 'cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500'
                        : 'border-gray-300 text-gray-700 hover:border-[#597485] hover:text-[#597485]'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-gray-500 dark:text-gray-400">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={isLastPage}
                    className={`rounded-lg border px-3 py-1.5 ${
                      isLastPage
                        ? 'cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500'
                        : 'border-gray-300 text-gray-700 hover:border-[#597485] hover:text-[#597485]'
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
            No transactions found for the selected filters.
          </p>
        )}
      </ComponentCard>
    </div>
  );
};

export default TransactionsReportPage;
