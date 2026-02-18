import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import InputField from '@shared/ui/forms/input/InputField';
import Select from '@shared/ui/forms/Select';
import StandardTable, { ColumnDef } from '@shared/ui/components/ui/table/StandardTable';
import ComponentCard from '@shared/ui/common/ComponentCard';
import { useSubscriptions, Subscription } from '@shared/hooks/useSubscriptions';
import { formatCurrency } from '@shared/utils/currency';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';

type Props = {
  onSelect?: (sub: Subscription) => void;
  compact?: boolean;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'COMPLETED', label: 'Completed' },
];

const BILLING_OPTIONS = [
  { value: 'all', label: 'All Billing' },
  { value: 'RECURRING', label: 'Recurring' },
  { value: 'PREPAID', label: 'Prepaid' },
];

const STYLE_OPTIONS = [
  { value: 'all', label: 'All Styles' },
  { value: 'DESIGNERS_CHOICE', label: "Designer's Choice" },
  { value: 'PICK_YOUR_OWN', label: 'Pick Your Own' },
];

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Biweekly',
  MONTHLY: 'Monthly',
  CUSTOM: 'Custom',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-green-500',
  PAUSED: 'text-yellow-500',
  CANCELLED: 'text-red-500',
  COMPLETED: 'text-gray-400',
};

export default function SubscriptionList({ onSelect, compact = false }: Props) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [billingFilter, setBillingFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { formatDate } = useBusinessTimezone();

  const filters = useMemo(
    () => ({
      status: statusFilter,
      billingType: billingFilter,
      style: styleFilter,
      search: search || undefined,
      page,
      limit: compact ? 10 : 20,
    }),
    [statusFilter, billingFilter, styleFilter, search, page, compact]
  );

  const { subscriptions, pagination, loading } = useSubscriptions(filters);

  const getNextDeliveryDate = (sub: Subscription): string => {
    const upcoming = sub.deliveries
      .filter((d) => d.status === 'SCHEDULED' || d.status === 'PENDING')
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    if (upcoming.length > 0) {
      return formatDate(upcoming[0].scheduledDate);
    }
    return '-';
  };

  const columns: ColumnDef<Subscription>[] = [
    {
      key: 'subscriptionNumber',
      header: '#',
      className: 'w-[80px]',
      render: (sub) => (
        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
          {sub.subscriptionNumber}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      className: 'w-[160px] max-w-[160px]',
      render: (sub) => (
        <div className="max-w-[160px] truncate">
          <span className="text-sm text-gray-800 dark:text-white/90" title={`${sub.customer.firstName} ${sub.customer.lastName}`}>
            {sub.customer.firstName} {sub.customer.lastName}
          </span>
        </div>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient',
      className: 'w-[160px] max-w-[160px]',
      render: (sub) => (
        <div className="max-w-[160px] truncate">
          <span className="text-sm text-gray-600 dark:text-gray-400" title={sub.recipientName}>
            {sub.recipientName}
          </span>
        </div>
      ),
    },
    {
      key: 'style',
      header: 'Style',
      className: 'w-[130px]',
      render: (sub) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {sub.style === 'DESIGNERS_CHOICE' ? "Designer's Choice" : 'Pick Your Own'}
        </span>
      ),
    },
    {
      key: 'frequency',
      header: 'Frequency',
      className: 'w-[100px]',
      render: (sub) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {FREQUENCY_LABELS[sub.frequency] || sub.frequency}
        </span>
      ),
    },
    {
      key: 'billing',
      header: 'Billing',
      className: 'w-[100px]',
      render: (sub) => (
        <div className="text-sm">
          <span className="text-gray-800 dark:text-white/90 whitespace-nowrap">
            {sub.billingType === 'RECURRING' ? 'Recurring' : 'Prepaid'}
          </span>
          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {formatCurrency(sub.defaultPriceCents)}
            {sub.billingType === 'PREPAID' && sub.totalDeliveries
              ? ` x ${sub.totalDeliveries}`
              : '/delivery'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[110px]',
      render: (sub) => (
        <div className="flex items-center gap-2">
          <span className={`text-2xl leading-none ${STATUS_COLORS[sub.status] || 'text-gray-400'}`}>
            •
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {sub.status.charAt(0) + sub.status.slice(1).toLowerCase()}
          </span>
        </div>
      ),
    },
    {
      key: 'nextDelivery',
      header: 'Next Delivery',
      className: 'w-[120px]',
      render: (sub) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {getNextDeliveryDate(sub)}
        </span>
      ),
    },
  ];

  // In compact mode, hide some columns to fit the POS panel
  const visibleColumns = compact
    ? columns.filter((c) => !['style', 'frequency', 'billing'].includes(c.key))
    : columns;

  const filtersRow = (
    <div className="space-y-4 mb-6">
      <div className={`grid gap-4 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        <InputField
          label="Search"
          placeholder="Name, number, recipient..."
          value={search || ''}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
        />
        {!compact && (
          <>
            <Select
              label="Billing"
              options={BILLING_OPTIONS}
              value={billingFilter}
              onChange={(val) => {
                setBillingFilter(val);
                setPage(1);
              }}
            />
            <Select
              label="Style"
              options={STYLE_OPTIONS}
              value={styleFilter}
              onChange={(val) => {
                setStyleFilter(val);
                setPage(1);
              }}
            />
          </>
        )}
      </div>
    </div>
  );

  const table = (
    <StandardTable
      columns={visibleColumns}
      data={subscriptions}
      loading={loading}
      onRowClick={onSelect}
      emptyState={{
        message: 'No subscriptions found',
      }}
      pagination={{
        currentPage: pagination.page,
        totalItems: pagination.total,
        itemsPerPage: pagination.limit,
        onPageChange: setPage,
      }}
    />
  );

  // Compact mode: no outer padding, no header
  if (compact) {
    return (
      <div>
        {filtersRow}
        {table}
      </div>
    );
  }

  // Full page layout
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Subscriptions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage recurring and prepaid flower subscriptions
          </p>
        </div>
        <Link
          to="/subscriptions/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          + New Subscription
        </Link>
      </div>

      <ComponentCard>
        {filtersRow}
        {table}
      </ComponentCard>
    </div>
  );
}
