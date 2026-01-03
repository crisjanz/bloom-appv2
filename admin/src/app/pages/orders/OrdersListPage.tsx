// pages/orders/OrdersListPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Link } from 'react-router';
import ComponentCard from '@shared/ui/common/ComponentCard';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import { useOrderLists } from '@domains/orders/hooks/useOrderLists';
import StandardTable, { ColumnDef } from '@shared/ui/components/ui/table/StandardTable';
import StatusBadge from '@app/components/orders/StatusBadge';
import Label from '@shared/ui/forms/Label';
import Select from '@shared/ui/forms/Select';
import DatePicker from '@shared/ui/forms/date-picker';
import { statusOptions as importedStatusOptions } from '@app/components/orders/types';
import { getStatusDisplayText } from '@shared/utils/orderStatusHelpers';
import { getOrderStatusColor } from '@shared/utils/statusColors';

// Inline SVG icon
const InboxIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
  </svg>
);

// Add "All Status" option to the imported status options
const statusOptions = [
  { value: "ALL", label: "All Status" },
  ...importedStatusOptions
];

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  createdAt: string | Date;
  requestedDeliveryDate?: string | Date;
  customerSnapshot?: {
    firstName?: string;
    lastName?: string;
  };
  deliveryInfo?: {
    recipientName?: string;
  };
  totalAmount: {
    amount: number;
  };
  fulfillmentType?: string;
}

const OrdersListPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatDate: formatBusinessDate, getBusinessDateString, loading: timezoneLoading } = useBusinessTimezone();

  // Hooks
  const { orders, loading, error, fetchOrders } = useOrderLists();

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'future' | 'all'>('all');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // More filters state
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [showDateRange, setShowDateRange] = useState(false);
  const [dateRangeFrom, setDateRangeFrom] = useState('');
  const [dateRangeTo, setDateRangeTo] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Get today/tomorrow dates
  const getTodayDate = () => {
    if (!getBusinessDateString) return '';
    return getBusinessDateString(new Date());
  };

  const getTomorrowDate = () => {
    if (!getBusinessDateString) return '';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getBusinessDateString(tomorrow);
  };

  // Auto-search after 5 seconds of inactivity
  useEffect(() => {
    if (searchTerm === activeSearchTerm) return;

    const timeoutId = setTimeout(() => {
      setActiveSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, activeSearchTerm]);

  // Handle Enter key for immediate search
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setActiveSearchTerm(searchTerm);
      setCurrentPage(1);
    }
  };

  // Load orders when filters change
  useEffect(() => {
    const filters: any = {
      status: statusFilter,
      search: activeSearchTerm,
      limit: 200
    };

    // Handle date filter buttons
    if (dateFilter === 'today') {
      const today = getTodayDate();
      if (today) {
        filters.deliveryDateFrom = today;
        filters.deliveryDateTo = today;
      }
    } else if (dateFilter === 'tomorrow') {
      const tomorrow = getTomorrowDate();
      if (tomorrow) {
        filters.deliveryDateFrom = tomorrow;
        filters.deliveryDateTo = tomorrow;
      }
    } else if (dateFilter === 'future') {
      const tomorrow = getTomorrowDate();
      if (tomorrow) {
        filters.deliveryDateFrom = tomorrow;
        // No "to" date = all future
      }
    }

    // More filters - single delivery date (overrides date filter buttons if set)
    if (deliveryDate) {
      filters.deliveryDateFrom = deliveryDate;
      filters.deliveryDateTo = deliveryDate;
    }

    // Date range (overrides single date if enabled)
    if (showDateRange && dateRangeFrom && dateRangeTo) {
      filters.deliveryDateFrom = dateRangeFrom;
      filters.deliveryDateTo = dateRangeTo;
    }

    // Order date filter
    if (orderDate) {
      filters.orderDateFrom = orderDate;
      filters.orderDateTo = orderDate;
    }

    fetchOrders(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, activeSearchTerm, dateFilter, deliveryDate, orderDate, dateRangeFrom, dateRangeTo]);

  // Format currency
  const formatCurrency = (amountInCents: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amountInCents / 100);
  };

  const getIsoString = (input: string | Date) => {
    if (typeof input === 'string') return input;
    return input.toISOString();
  };

  const formatDate = (dateInput: string | Date) => {
    if (timezoneLoading) return getIsoString(dateInput);

    const datePart = getIsoString(dateInput).split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return formatBusinessDate(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTimestamp = (timestamp: string | Date) => {
    if (timezoneLoading) return getIsoString(timestamp);

    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatBusinessDate(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Handle row click
  const handleRowClick = (order: Order) => {
    navigate(`/orders/${order.id}`);
  };

  // Pagination logic
  const totalItems = orders.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = orders.slice(startIndex, endIndex);

  // Define table columns with consistent widths
  const columns: ColumnDef<Order>[] = [
    {
      key: 'status',
      header: 'Status',
      className: 'w-[160px]',
      render: (order) => {
        const displayText = getStatusDisplayText(order.status as any, order.orderType as any);
        const statusColor = getOrderStatusColor(order.status as any);
        return (
          <div className="flex items-center gap-2">
            <span className={`text-2xl leading-none ${statusColor}`}>•</span>
            <span className={`text-sm font-medium ${statusColor}`}>{displayText}</span>
          </div>
        );
      },
    },
    {
      key: 'orderNumber',
      header: 'Order #',
      className: 'w-[100px]',
      render: (order) => (
        <div>
          <div className="text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
            #{order.orderNumber}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {formatDate(order.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'deliveryDate',
      header: 'Delivery Date',
      className: 'w-[140px]',
      render: (order) => (
        <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
          {order.requestedDeliveryDate ? formatDate(order.requestedDeliveryDate) : '—'}
        </span>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient',
      className: 'w-[200px] max-w-[200px]',
      render: (order) => {
        const recipient = order.deliveryInfo
          ? order.deliveryInfo.recipientName || '—'
          : order.orderType === 'PICKUP' ? 'Pickup' : '—';
        return (
          <div className="max-w-[200px] truncate">
            <span className="text-sm text-gray-700 dark:text-gray-300" title={recipient}>
              {recipient}
            </span>
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'Customer',
      className: 'w-[140px] max-w-[140px]',
      render: (order) => {
        const name = order.customerSnapshot
          ? `${order.customerSnapshot.firstName ?? ''} ${order.customerSnapshot.lastName ?? ''}`.trim() || 'Guest'
          : 'Guest';
        return (
          <div className="max-w-[140px] truncate">
            <span className="text-sm text-gray-700 dark:text-gray-300" title={name}>
              {name}
            </span>
          </div>
        );
      },
    },
    {
      key: 'total',
      header: 'Total',
      className: 'text-right w-[100px]',
      render: (order) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
          {formatCurrency(order.totalAmount.amount)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageBreadcrumb />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage and track all your orders
          </p>
        </div>
        <Link
          to="/orders/new"
          className="inline-flex items-center px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
        >
          + New Order
        </Link>
      </div>

      <ComponentCard>
        <div className="space-y-4">
          {/* Always Visible Filters */}
          <div className="space-y-3">
            {/* Row 1: Status + Date Filter Buttons + Search + More */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Status */}
              <div className="md:col-span-2">
                <Label className="text-xs">Status</Label>
                <Select
                  options={statusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  className="text-sm"
                />
              </div>

              {/* Date Filter Buttons */}
              <div className="md:col-span-5">
                <Label className="text-xs mb-1.5 block">Delivery</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDateFilter('today')}
                    className={`flex-1 h-[42px] px-3 rounded-lg border text-sm font-medium transition-all ${
                      dateFilter === 'today'
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-500'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setDateFilter('tomorrow')}
                    className={`flex-1 h-[42px] px-3 rounded-lg border text-sm font-medium transition-all ${
                      dateFilter === 'tomorrow'
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-500'
                    }`}
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => setDateFilter('future')}
                    className={`flex-1 h-[42px] px-3 rounded-lg border text-sm font-medium transition-all ${
                      dateFilter === 'future'
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-500'
                    }`}
                  >
                    Future
                  </button>
                  <button
                    onClick={() => setDateFilter('all')}
                    className={`flex-1 h-[42px] px-3 rounded-lg border text-sm font-medium transition-all ${
                      dateFilter === 'all'
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-500'
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>

              {/* Search + More Filters Button */}
              <div className="md:col-span-5">
                <Label className="text-xs">Search</Label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Order #, customer... (Enter to search)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-400"
                  />
                  <button
                    onClick={() => setShowMoreFilters(!showMoreFilters)}
                    className="px-4 py-2 text-sm font-medium text-brand-500 hover:text-brand-600 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap"
                  >
                    {showMoreFilters ? 'Less' : 'More'} Filters
                  </button>
                </div>
                {searchTerm && searchTerm !== activeSearchTerm && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Press Enter or wait 5s...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* More Filters (Collapsible) */}
          {showMoreFilters && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
              {/* All Date Pickers in One Row - Fixed 4 Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Delivery Date (always in column 1) */}
                <div>
                  <DatePicker
                    id="order-delivery-date"
                    label="Delivery Date"
                    placeholder="Select date"
                    defaultDate={deliveryDate || undefined}
                    onChange={(selectedDates) => {
                      if (selectedDates.length > 0) {
                        const date = selectedDates[0];
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setDeliveryDate(`${year}-${month}-${day}`);
                      } else {
                        setDeliveryDate('');
                      }
                      setCurrentPage(1);
                      setShowDateRange(false);
                    }}
                  />
                </div>

                {/* Order Date (always in column 2) */}
                <div>
                  <DatePicker
                    id="order-created-date"
                    label="Order Date"
                    placeholder="Select date"
                    defaultDate={orderDate || undefined}
                    onChange={(selectedDates) => {
                      if (selectedDates.length > 0) {
                        const date = selectedDates[0];
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setOrderDate(`${year}-${month}-${day}`);
                      } else {
                        setOrderDate('');
                      }
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {/* Column 3 & 4: Range Button OR Range Pickers */}
                {!showDateRange ? (
                  /* Range Toggle Button (spans columns 3-4) */
                  <div className="md:col-span-2">
                    <Label className="text-xs opacity-0">Range</Label>
                    <button
                      onClick={() => {
                        setShowDateRange(true);
                        setDeliveryDate(''); // Clear single date when enabling range
                      }}
                      className="w-full h-[42px] px-4 text-sm font-medium text-brand-500 hover:text-brand-600 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      + Date Range
                    </button>
                  </div>
                ) : (
                  /* Range Date Pickers */
                  <>
                    <div>
                      <DatePicker
                        id="order-range-from"
                        label="Range From"
                        placeholder="Start date"
                        defaultDate={dateRangeFrom || undefined}
                        onChange={(selectedDates) => {
                          if (selectedDates.length > 0) {
                            const date = selectedDates[0];
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            setDateRangeFrom(`${year}-${month}-${day}`);
                          } else {
                            setDateRangeFrom('');
                          }
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                    <div>
                      <DatePicker
                        id="order-range-to"
                        label="Range To"
                        placeholder="End date"
                        defaultDate={dateRangeTo || undefined}
                        onChange={(selectedDates) => {
                          if (selectedDates.length > 0) {
                            const date = selectedDates[0];
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            setDateRangeTo(`${year}-${month}-${day}`);
                          } else {
                            setDateRangeTo('');
                          }
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Clear Filters */}
              {(orderDate || deliveryDate || statusFilter !== 'ALL' || searchTerm || dateFilter !== 'all' || showDateRange) && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setOrderDate('');
                      setDeliveryDate('');
                      setStatusFilter('ALL');
                      setSearchTerm('');
                      setActiveSearchTerm('');
                      setDateFilter('all');
                      setShowDateRange(false);
                      setDateRangeFrom('');
                      setDateRangeTo('');
                      setCurrentPage(1);
                    }}
                    className="text-sm text-brand-500 hover:text-brand-600 hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* StandardTable */}
          <StandardTable
            columns={columns}
            data={paginatedOrders}
            loading={loading && orders.length === 0}
            emptyState={{
              icon: <InboxIcon className="h-12 w-12" />,
              message: error
                ? `Failed to load orders: ${error}`
                : searchTerm || statusFilter !== 'ALL' || dateFilter !== 'all' || deliveryDate || orderDate || showDateRange
                ? 'No orders match your filters'
                : 'No orders found',
              action: error ? {
                label: 'Retry',
                onClick: () => fetchOrders({ status: statusFilter, search: activeSearchTerm, limit: 200 })
              } : undefined
            }}
            pagination={{
              currentPage,
              totalItems,
              itemsPerPage,
              onPageChange: setCurrentPage
            }}
            onRowClick={handleRowClick}
            className="mt-4"
          />
        </div>
      </ComponentCard>
    </div>
  );
};

export default OrdersListPage;
