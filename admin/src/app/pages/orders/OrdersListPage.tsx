// pages/orders/OrdersListPage.tsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@shared/ui/components/ui/table';
import Badge from '@shared/ui/components/ui/badge/Badge';
import ComponentCard from '@shared/ui/common/ComponentCard';
import { statusOptions as importedStatusOptions } from '@app/components/orders/types';
import StatusBadge from '@app/components/orders/StatusBadge';
import Label from '@shared/ui/forms/Label';
import Select from '@shared/ui/forms/Select';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
// MIGRATION: Use domain hook for better order management
import { useOrderLists } from '@domains/orders/hooks/useOrderLists';

import type { OrderStatus, OrderType } from '@shared/utils/orderStatusHelpers';

// MIGRATION: Order interface now comes from domain layer

// Add "All Status" option to the imported status options
const statusOptions = [
  { value: "ALL", label: "All Status" },
  ...importedStatusOptions
];

const OrdersListPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatDate: formatBusinessDate, loading: timezoneLoading } = useBusinessTimezone();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // MIGRATION: Use domain hooks for better order management
  const { orders, loading, error, fetchOrders } = useOrderLists();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState(''); // Actually used for filtering
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [orderDate, setOrderDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Auto-search after 5 seconds of inactivity
  useEffect(() => {
    if (searchTerm === activeSearchTerm) return; // No change

    const timeoutId = setTimeout(() => {
      setActiveSearchTerm(searchTerm);
    }, 5000); // 5 second delay

    return () => clearTimeout(timeoutId);
  }, [searchTerm, activeSearchTerm]);

  // Handle Enter key press for immediate search
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setActiveSearchTerm(searchTerm);
    }
  };

  // Load orders when filters change
  useEffect(() => {
    const filters: any = {
      status: statusFilter,
      search: activeSearchTerm,
      limit: 50
    };

    // Add date filters if set (use same date for from and to for single-day filtering)
    if (orderDate) {
      filters.orderDateFrom = orderDate;
      filters.orderDateTo = orderDate;
    }
    if (deliveryDate) {
      filters.deliveryDateFrom = deliveryDate;
      filters.deliveryDateTo = deliveryDate;
    }

    fetchOrders(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, activeSearchTerm, orderDate, deliveryDate]);

  const handleView = (id: string) => {
    navigate(`/orders/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/orders/${id}/edit`);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount / 100);
  };

  const getIsoString = (input: string | Date) => {
    if (typeof input === 'string') {
      return input;
    }
    return input.toISOString();
  };

  const formatDate = (dateInput: string | Date) => {
    if (timezoneLoading) return getIsoString(dateInput);

    // Extract just the date part to avoid timezone conversion issues
    const datePart = getIsoString(dateInput).split('T')[0]; // Get YYYY-MM-DD part
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day); // Create date in local timezone

    return formatBusinessDate(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format timestamp (for createdAt) - shows full date/time
  const formatTimestamp = (timestamp: string | Date) => {
    if (timezoneLoading) return getIsoString(timestamp);

    // For timestamps, we want to show them in business timezone
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatBusinessDate(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Only show loading spinner on initial load
  if (loading && orders.length === 0) {
    return (
      <div className="p-6">
        <PageBreadcrumb />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#597485]"></div>
        </div>
      </div>
    );
  }

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
          className="inline-flex items-center px-4 py-2 bg-[#597485] text-white text-sm font-medium rounded-lg hover:bg-[#4e6575] transition-colors"
        >
          + New Order
        </Link>
      </div>

      {/* Single Component Card with Filters and Table */}
      <ComponentCard title="Orders Management">
        <div className="space-y-6">
          {/* Filters Section */}
          <div className="space-y-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            {/* Always Visible: Search */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label>Search Orders</Label>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by order number, customer name... (Press Enter)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-400"
                />
                {searchTerm && searchTerm !== activeSearchTerm && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Press Enter to search, or wait 5 seconds...
                  </p>
                )}
              </div>

              {/* Show/Hide Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 h-[42px] text-sm font-medium text-[#597485] hover:text-[#4e6575] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>

            {/* Collapsible Filters */}
            {showFilters && (
              <div className="space-y-6 pt-4">
                {/* Row 1: Status Filter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Filter by Status</Label>
                    <Select
                      options={statusOptions}
                      placeholder="Select Status"
                      onChange={handleStatusFilterChange}
                      value={statusFilter}
                      className="dark:bg-gray-700"
                    />
                  </div>
                </div>

                {/* Row 2: Date Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Order Date */}
                  <div>
                    <Label>Order Date</Label>
                    <input
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Select date"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Filter by when the order was created
                    </p>
                  </div>

                  {/* Delivery Date */}
                  <div>
                    <Label>Delivery Date</Label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Select date"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Filter by scheduled delivery date
                    </p>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {(orderDate || deliveryDate || statusFilter !== 'ALL' || searchTerm) && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setOrderDate('');
                        setDeliveryDate('');
                        setStatusFilter('ALL');
                        setSearchTerm('');
                        setActiveSearchTerm('');
                      }}
                      className="text-sm text-[#597485] hover:text-[#4e6575] hover:underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table Section */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Order
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Customer
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Recipient
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Delivery Date
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Status
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Total
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {orders.map((order) => (
                    <TableRow key={order.id || order.orderNumber} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            #{order.orderNumber}
                          </span>
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                            {formatTimestamp(order.createdAt)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {order.customerSnapshot
                          ? `${order.customerSnapshot.firstName ?? ''} ${order.customerSnapshot.lastName ?? ''}`.trim() || 'Guest'
                          : 'Guest'}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {order.deliveryInfo
                          ? order.deliveryInfo.recipientName || '—'
                          : order.orderType === 'PICKUP' ? 'Pickup' : '—'
                        }
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {order.requestedDeliveryDate ? formatDate(order.requestedDeliveryDate) : '—'}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <StatusBadge
                          status={order.status}
                          orderType={order.orderType as any}
                        />
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <span className="font-medium text-gray-800 dark:text-white">
                          {formatCurrency(order.totalAmount.amount)}
                        </span>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleView(order.id)}
                            className="text-sm font-medium text-[#597485] hover:text-[#4e6575] hover:underline"
                          >
                            View
                          </button>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <button
                            onClick={() => handleEdit(order.id)}
                            className="text-sm font-medium text-[#597485] hover:text-[#4e6575] hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* MIGRATION: Enhanced empty states with error handling */}
            {orders.length === 0 && !loading && (
              <div className="text-center py-12">
                {error ? (
                  <div className="text-red-500 dark:text-red-400">
                    <div className="mb-2">Failed to load orders</div>
                    <div className="text-sm">{error}</div>
                    <button
                      onClick={() => fetchOrders({ status: statusFilter, search: activeSearchTerm, limit: 50 })}
                      className="mt-3 text-sm text-[#597485] hover:text-[#4e6575] underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">
                    {searchTerm || statusFilter !== 'ALL' 
                      ? 'No orders match your search criteria' 
                      : 'No orders found'
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ComponentCard>
    </div>
  );
};

export default OrdersListPage;
