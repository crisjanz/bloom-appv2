import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import ComponentCard from '@shared/ui/common/ComponentCard';
import StandardTable from '@shared/ui/components/ui/table/StandardTable';
import { getOrderStatusColor } from '@shared/utils/statusColors';
import { PencilIcon } from '@shared/assets/icons';
import Select from '@shared/ui/forms/Select';
import DatePicker from '@shared/ui/forms/date-picker';
import ScanExternalOrderModal from '@app/components/orders/ScanExternalOrderModal';
import { formatCurrency } from '@shared/utils/currency';
import useOrderNumberPrefix from '@shared/hooks/useOrderNumberPrefix';
import { formatOrderNumber } from '@shared/utils/formatOrderNumber';

type ExternalOrderFilters = {
  provider: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

type ExternalProvider = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  sortOrder: number;
};

type ExternalOrder = {
  id: string;
  orderNumber: number;
  status: string;
  externalSource?: string | null;
  externalReference?: string | null;
  recipientCustomer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  recipientName?: string | null;
  deliveryDate?: string | null;
  images?: string[];
  paymentAmount?: number | null;
};

const statusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PAID', label: 'Paid' },
  { value: 'IN_DESIGN', label: 'In Design' },
  { value: 'READY', label: 'Ready' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function ExternalOrdersPage() {
  const orderNumberPrefix = useOrderNumberPrefix();
  const [orders, setOrders] = useState<ExternalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ExternalProvider[]>([]);
  const [showScanModal, setShowScanModal] = useState(false);
  const [filters, setFilters] = useState<ExternalOrderFilters>({
    provider: 'ALL',
    status: 'ALL',
    dateFrom: '',
    dateTo: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
  });

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [filters, pagination.page]);

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/external-providers');
      const data = await response.json();
      setProviders(data);
    } catch (error) {
      console.error('Failed to load external providers:', error);
    }
  };

  // Build provider options from fetched providers
  const providerOptions = [
    { value: 'ALL', label: 'All Providers' },
    ...providers
      .filter((p) => p.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        value: p.code,
        label: p.name,
      })),
  ];

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        source: 'EXTERNAL',
        page: pagination.page.toString(),
        limit: pagination.pageSize.toString(),
        ...(filters.provider && filters.provider !== 'ALL' && { externalSource: filters.provider }),
        ...(filters.status && filters.status !== 'ALL' && { status: filters.status }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
      });

      const response = await fetch(`/api/orders/list?${params}`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setOrders(data.data || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      console.error('Failed to load external orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order #',
      render: (order: ExternalOrder) => `#${formatOrderNumber(order.orderNumber || 0, orderNumberPrefix)}`,
    },
    {
      key: 'externalSource',
      header: 'Provider',
      render: (order: ExternalOrder) => (
        <span className="inline-flex items-center gap-2">
          {order.externalSource === 'FTD' && (
            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">FTD</span>
          )}
          {order.externalSource === 'DOORDASH' && (
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">DoorDash</span>
          )}
          {order.externalSource === 'FUNERAL_SERVICE' && (
            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">Funeral</span>
          )}
          {order.externalSource === 'OTHER' && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Other</span>
          )}
        </span>
      ),
    },
    {
      key: 'externalReference',
      header: 'External Ref',
      render: (order: ExternalOrder) => order.externalReference || '—',
    },
    {
      key: 'customer',
      header: 'Recipient',
      render: (order: ExternalOrder) => {
        if (order.recipientCustomer) {
          return `${order.recipientCustomer.firstName} ${order.recipientCustomer.lastName}`;
        }
        return order.recipientName || '—';
      },
    },
    {
      key: 'deliveryDate',
      header: 'Delivery',
      render: (order: ExternalOrder) => {
        if (!order.deliveryDate) return '—';
        const date = new Date(order.deliveryDate);
        return date.toLocaleDateString('en-CA');
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (order: ExternalOrder) => {
        const statusColor = getOrderStatusColor(order.status);
        return (
          <span className="inline-flex items-center gap-2">
            <span className={`text-2xl ${statusColor}`}>•</span>
            <span className="capitalize">{order.status.replace('_', ' ').toLowerCase()}</span>
          </span>
        );
      },
    },
    {
      key: 'images',
      header: 'OCR',
      render: (order: ExternalOrder) => {
        if (order.images?.length > 0) {
          return <span className="text-green-600 text-xs">✓ Scanned</span>;
        }
        return <span className="text-gray-400 text-xs">Manual</span>;
      },
    },
    {
      key: 'paymentAmount',
      header: 'Total',
      render: (order: ExternalOrder) => formatCurrency(order.paymentAmount || 0),
    },
    {
      key: 'actions',
      header: '',
      render: (order: ExternalOrder) => (
        <div className="flex items-center gap-2 justify-end">
          <Link
            to={`/orders/${order.id}`}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Edit Order"
          >
            <PencilIcon className="w-4 h-4" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageBreadcrumb
        customBreadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'External Orders', path: '/external-orders' },
        ]}
      />

      {/* Header - OUTSIDE card */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">External Orders</h1>
          <p className="text-sm text-gray-500">FTD, DoorDash, and other partner orders</p>
        </div>
        <button
          onClick={() => setShowScanModal(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Scan Order
        </button>
      </div>

      {/* Card with Filters + Table - INSIDE card */}
      <ComponentCard>
        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Select
            label="Provider"
            options={providerOptions}
            value={filters.provider}
            onChange={(value) => setFilters({ ...filters, provider: value })}
          />

          <Select
            label="Status"
            options={statusOptions}
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
          />

          <DatePicker
            id="external-orders-date-from"
            label="From Date"
            placeholder="Select start date"
            defaultDate={filters.dateFrom || undefined}
            onChange={(selectedDates) => {
              const date = selectedDates[0];
              setFilters({ ...filters, dateFrom: date ? date.toISOString().split('T')[0] : '' });
            }}
          />

          <DatePicker
            id="external-orders-date-to"
            label="To Date"
            placeholder="Select end date"
            defaultDate={filters.dateTo || undefined}
            onChange={(selectedDates) => {
              const date = selectedDates[0];
              setFilters({ ...filters, dateTo: date ? date.toISOString().split('T')[0] : '' });
            }}
          />
        </div>

        <StandardTable
          columns={columns}
          data={orders}
          loading={loading}
          pagination={{
            currentPage: pagination.page,
            itemsPerPage: pagination.pageSize,
            totalItems: pagination.total,
            onPageChange: (page) => setPagination((prev) => ({ ...prev, page })),
          }}
        />
      </ComponentCard>

      {/* Scan Order Modal */}
      <ScanExternalOrderModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onOrderCreated={() => {
          setShowScanModal(false);
          loadOrders();
        }}
      />
    </div>
  );
}
