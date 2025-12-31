import React, { useState } from 'react';
import { useFtdOrders } from '../../../domains/ftd/hooks/useFtdOrders';
import { FtdOrder } from '../../../domains/ftd/types/ftdTypes';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import StandardTable, { ColumnDef } from '@shared/ui/components/ui/table/StandardTable';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import ComponentCard from '@shared/ui/common/ComponentCard';
import Label from '@shared/ui/forms/Label';
import InputField from '@shared/ui/forms/input/InputField';
import Select from '@shared/ui/forms/Select';
import DatePicker from '@shared/ui/forms/date-picker';
import { getOrderStatusColor } from '@shared/utils/statusColors';
import { getStatusDisplayText } from '@shared/utils/orderStatusHelpers';

// Inline SVG icons
const PencilIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const ArrowPathIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const statusFilters = [
  { value: '', label: 'All statuses' },
  { value: 'NEEDS_ACTION', label: 'Needs Action' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'IN_DESIGN', label: 'In Design' },
  { value: 'READY', label: 'Ready' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

export default function FtdOrdersPage() {
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(getTodayDate());
  const [searchQuery, setSearchQuery] = useState('');
  const { orders, stats, loading, updateOrder, refresh } = useFtdOrders({
    status: statusFilter,
    deliveryDate: dateFilter,
    search: searchQuery
  });
  const [updating, setUpdating] = useState(false);
  const { formatDate } = useBusinessTimezone();

  const handleUpdate = async () => {
    setUpdating(true);
    await updateOrder();
    setUpdating(false);
  };

  const handleRefreshDetails = async (ftdOrderId: string) => {
    try {
      const res = await fetch(`/api/ftd/orders/${ftdOrderId}/refresh-details`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        refresh();
        alert('FTD order details refreshed successfully');
      }
    } catch (error) {
      console.error('Failed to refresh FTD details:', error);
      alert('Failed to refresh details');
    }
  };

  const renderProductSummary = (order: FtdOrder) => {
    const description = order.importedPayload?.productDescription || order.orderItems?.[0]?.customName;
    return description || '—';
  };

  // Define table columns
  const columns: ColumnDef<FtdOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      className: 'w-[100px]',
      render: (order) => (
        <div>
          <div className="text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
            #{order.orderNumber}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {order.externalStatus || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[160px]',
      render: (order) => {
        const displayText = getStatusDisplayText(order.status, order.orderType as any);
        const statusColor = getOrderStatusColor(order.status);
        return (
          <div className="flex items-center gap-2">
            <span className={`text-2xl leading-none ${statusColor}`}>•</span>
            <span className={`text-sm font-medium ${statusColor}`}>{displayText}</span>
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => {
        const customerName = order.customer
          ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || 'Unknown'
          : 'Unknown';
        return (
          <div className="max-w-[120px] truncate" title={customerName}>
            {customerName}
          </div>
        );
      },
    },
    {
      key: 'recipient',
      header: 'Recipient',
      render: (order) => {
        const recipientName = order.recipientCustomer
          ? `${order.recipientCustomer.firstName ?? ''} ${order.recipientCustomer.lastName ?? ''}`.trim() || 'Unknown'
          : order.deliveryAddress
          ? `${order.deliveryAddress.firstName ?? ''} ${order.deliveryAddress.lastName ?? ''}`.trim()
          : 'Unknown';
        return (
          <div className="max-w-[120px] truncate" title={recipientName}>
            {recipientName}
          </div>
        );
      },
    },
    {
      key: 'delivery',
      header: 'Delivery',
      render: (order) => (
        <div className="whitespace-nowrap">
          {order.deliveryDate
            ? formatDate(order.deliveryDate) || new Date(order.deliveryDate).toLocaleDateString()
            : 'ASAP'}
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (order) => {
        const productSummary = renderProductSummary(order);
        return (
          <div className="max-w-[200px] truncate" title={productSummary}>
            {productSummary}
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right',
      render: (order) => (
        <div className="whitespace-nowrap font-medium">
          ${(order.paymentAmount / 100).toFixed(2)}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[100px]',
      render: (order) => (
        <div className="flex items-center gap-3">
          <a
            href={`/orders/${order.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            title="Edit order"
          >
            <PencilIcon className="w-5 h-5" />
          </a>
          {order.ftdOrderId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRefreshDetails(order.ftdOrderId);
              }}
              className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Refresh FTD details"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageBreadcrumb />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">FTD Wire Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Incoming wire orders from the FTD network
          </p>
        </div>
        <button
          onClick={handleUpdate}
          disabled={updating || loading}
          className="inline-flex items-center px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 mr-2 ${updating ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {updating ? 'Updating...' : 'Update Orders'}
        </button>
      </div>

      {/* Card with Filters + Table */}
      <ComponentCard>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Search"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className={searchQuery ? 'opacity-50 pointer-events-none' : ''}>
              <DatePicker
                id="ftd-delivery-date"
                label="Delivery Date"
                placeholder="Select delivery date"
                defaultDate={dateFilter || undefined}
                onChange={(selectedDates) => {
                  if (selectedDates.length > 0) {
                    const date = selectedDates[0];
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    setDateFilter(`${year}-${month}-${day}`);
                  } else {
                    setDateFilter('');
                  }
                }}
              />
            </div>

            <div>
              <Select
                label="FTD Status"
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                options={statusFilters}
                disabled={!!searchQuery}
              />
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                setDateFilter('');
                setSearchQuery('');
                setStatusFilter('');
              }}
              className="text-sm text-brand-500 hover:text-brand-600 font-medium"
            >
              Clear all filters
            </button>
          </div>
        </div>

        {/* Table */}
        <StandardTable
          columns={columns}
          data={orders}
          loading={loading && orders.length === 0}
          emptyState={{
            message: "No FTD orders found for the selected filters",
          }}
        />
      </ComponentCard>
    </div>
  );
}