import { useEffect, useMemo, useState } from 'react';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import ComponentCard from '@shared/ui/common/ComponentCard';
import Select from '@shared/ui/forms/Select';
import InputField from '@shared/ui/forms/input/InputField';
import DatePicker from '@shared/ui/forms/date-picker';
import { getMonthRange, getTodayRange, getWeekRange } from '@app/components/reports/dateUtils';
import { useTransactionReport } from '@domains/payments/hooks/useTransactionReport';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import type { PaymentTransactionReport } from '@domains/payments/types/transactionReports';
import usePaymentSettingsConfig from '@domains/payments/hooks/usePaymentSettingsConfig';
import StandardTable, { ColumnDef } from '@shared/ui/components/ui/table/StandardTable';
import { getPaymentStatusColor } from '@shared/utils/statusColors';

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

  // Define table columns
  const columns: ColumnDef<PaymentTransactionReport>[] = [
    {
      key: 'status',
      header: 'Status',
      className: 'w-[140px]',
      render: (transaction) => {
        const statusColor = getPaymentStatusColor(transaction.status);
        const statusText = toTitleCase(transaction.status);
        return (
          <div className="flex items-center gap-2">
            <span className={`text-2xl leading-none ${statusColor}`}>•</span>
            <span className={`text-sm font-medium ${statusColor}`}>{statusText}</span>
          </div>
        );
      },
    },
    {
      key: 'transaction',
      header: 'PT #',
      className: 'w-[120px]',
      render: (transaction) => {
        const dateDisplay =
          timezoneLoading && transaction.createdAt
            ? new Date(transaction.createdAt).toLocaleString()
            : formatDate(transaction.createdAt, {
                hour: '2-digit',
                minute: '2-digit'
              });
        return (
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
              {transaction.transactionNumber}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {dateDisplay}
            </div>
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'Customer',
      className: 'w-[150px] max-w-[150px]',
      render: (transaction) => {
        const customerName = transaction.customer
          ? [transaction.customer.firstName, transaction.customer.lastName].filter(Boolean).join(' ').trim()
          : '';
        const displayCustomer = customerName || 'Guest';
        return (
          <div className="max-w-[150px] truncate">
            <span className="text-sm text-gray-800 dark:text-white/90 whitespace-nowrap" title={displayCustomer}>
              {displayCustomer}
            </span>
          </div>
        );
      },
    },
    {
      key: 'paymentMethods',
      header: 'Payment Method',
      className: 'w-[180px] max-w-[180px]',
      render: (transaction) => {
        const paymentMethods = transaction.paymentMethods.length ? transaction.paymentMethods : null;
        const firstMethod = paymentMethods?.[0];
        const hasMultiple = (paymentMethods?.length ?? 0) > 1;

        if (!firstMethod) {
          return <span className="text-xs text-gray-500 dark:text-gray-400">—</span>;
        }

        return (
          <div className="max-w-[180px]">
            <div className="text-sm text-gray-800 dark:text-white/90 truncate" title={resolvePaymentMethodLabel(firstMethod)}>
              {resolvePaymentMethodLabel(firstMethod)}
              {hasMultiple && ` +${paymentMethods!.length - 1}`}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {formatCurrency(firstMethod.amount)}
            </div>
          </div>
        );
      },
    },
    {
      key: 'channel',
      header: 'Channel',
      className: 'w-[100px]',
      render: (transaction) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {channelLabels[transaction.channel] ?? toTitleCase(transaction.channel)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      className: 'w-[100px] text-right',
      render: (transaction) => (
        <span className="text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
          {formatCurrency(transaction.totalAmount)}
        </span>
      ),
    },
    {
      key: 'orders',
      header: 'Order #',
      className: 'w-[100px]',
      render: (transaction) => {
        const orderNumbers = transaction.orderPayments
          .map((payment) => payment.order?.orderNumber)
          .filter((value): value is number => typeof value === 'number');
        const firstOrder = orderNumbers[0];
        const hasMultiple = orderNumbers.length > 1;

        return firstOrder ? (
          <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
            #{firstOrder}{hasMultiple && ` +${orderNumbers.length - 1}`}
          </span>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
        );
      },
    },
  ];

  return (
    <div className="p-6">
      <PageBreadcrumb />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Payment Transactions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review PT-XXXX payment transactions with channel, provider, and status filters
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
            exporting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-brand-500 hover:bg-brand-600'
          }`}
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Card with Filters + Table */}
      <ComponentCard>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {(['TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as DatePreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetChange(preset)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  datePreset === preset
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-brand-500 hover:text-brand-500 dark:text-gray-300'
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
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-brand-500 transition-colors hover:border-brand-500 hover:bg-brand-500/10"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
            <DatePicker
              id="transaction-date-from"
              label="Date From"
              placeholder="Select start date"
              defaultDate={customStartDate || undefined}
              onChange={(selectedDates) => {
                if (selectedDates.length > 0) {
                  const date = selectedDates[0];
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  handleCustomStartChange(`${year}-${month}-${day}`);
                }
              }}
            />

            <DatePicker
              id="transaction-date-to"
              label="Date To"
              placeholder="Select end date"
              defaultDate={customEndDate || undefined}
              onChange={(selectedDates) => {
                if (selectedDates.length > 0) {
                  const date = selectedDates[0];
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  handleCustomEndChange(`${year}-${month}-${day}`);
                }
              }}
            />

            <Select
              label="Status"
              options={statusOptions}
              value={filters.status ?? 'ALL'}
              onChange={handleStatusChange}
            />

            <Select
              label="Provider"
              options={providerOptions}
              value={filters.provider ?? 'ALL'}
              onChange={handleProviderChange}
            />

            <Select
              label="Channel"
              options={channelOptions}
              value={filters.channel ?? 'ALL'}
              onChange={handleChannelChange}
            />

            <Select
              label="Payment Method"
              options={paymentMethodOptions}
              value={filters.paymentMethod ?? 'ALL'}
              onChange={handlePaymentMethodChange}
            />

            <div className="md:col-span-2">
              <InputField
                label="Search"
                type="text"
                value={searchInput}
                placeholder="Search PT#, customer, order#..."
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleApplySearch();
                  }
                }}
              />
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                setSearchInput('');
                updateFilters({
                  search: undefined,
                  status: undefined,
                  provider: undefined,
                  channel: undefined,
                  paymentMethod: undefined
                });
                handlePresetChange('WEEK');
              }}
              className="text-sm text-brand-500 hover:text-brand-600 font-medium"
            >
              Clear all filters
            </button>
          </div>

          {(error || exportError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              {exportError || error}
            </div>
          )}
        </div>

        {/* Table */}
        <StandardTable
          columns={columns}
          data={transactions}
          loading={loading && !transactions.length}
          emptyState={{
            message: "No transactions found",
          }}
          pagination={
            pagination && transactions.length > 0
              ? {
                  currentPage: page,
                  totalItems: pagination.total,
                  itemsPerPage: pageSize,
                  onPageChange: goToPage,
                }
              : undefined
          }
        />
      </ComponentCard>
    </div>
  );
};

export default TransactionsReportPage;
