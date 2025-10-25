import React, { useState, useEffect } from 'react';
import { useFtdOrders } from '../../../domains/ftd/hooks/useFtdOrders';
import { FtdOrder } from '../../../domains/ftd/types/ftdTypes';
import StatusBadge from '@app/components/orders/StatusBadge';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';

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

  const handleStatCardClick = (statusType: string) => {
    switch (statusType) {
      case 'needsAction':
        setStatusFilter('NEEDS_ACTION');
        break;
      case 'accepted':
        setStatusFilter('ACCEPTED');
        break;
      case 'delivered':
        setStatusFilter('DELIVERED');
        break;
      case 'all':
        setStatusFilter('');
        break;
    }
  };

  const renderProductSummary = (order: FtdOrder) => {
    const description = order.importedPayload?.productDescription || order.orderItems?.[0]?.customName;
    return description || '—';
  };

  return (
    <div className="p-6 max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white">FTD Wire Orders</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Incoming wire orders from the FTD network
          </p>
        </div>

        <button
          onClick={handleUpdate}
          disabled={updating || loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#597485] hover:bg-[#4e6575] text-white rounded-xl transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`}
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

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Needs Action"
            count={stats.needsAction}
            color="orange"
            onClick={() => handleStatCardClick('needsAction')}
            active={statusFilter === 'NEEDS_ACTION'}
          />
          <StatCard
            label="Accepted"
            count={stats.accepted}
            color="blue"
            onClick={() => handleStatCardClick('accepted')}
            active={statusFilter === 'ACCEPTED'}
          />
          <StatCard
            label="Delivered"
            count={stats.delivered}
            color="green"
            onClick={() => handleStatCardClick('delivered')}
            active={statusFilter === 'DELIVERED'}
          />
          <StatCard
            label="Total Orders"
            count={stats.totalOrders}
            color="gray"
            onClick={() => handleStatCardClick('all')}
            active={statusFilter === ''}
          />
        </div>
      )}

      <div className="bg-white dark:bg-boxdark rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search <span className="text-xs text-gray-500">(searches all orders)</span>
            </label>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-stroke dark:border-strokedark rounded-lg bg-white dark:bg-boxdark text-black dark:text-white placeholder:text-gray-400"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delivery Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              disabled={!!searchQuery}
              className={`w-full px-4 py-2 border border-stroke dark:border-strokedark rounded-lg bg-white dark:bg-boxdark text-black dark:text-white ${
                searchQuery ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              FTD Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={!!searchQuery}
              className={`w-full px-4 py-2 border border-stroke dark:border-strokedark rounded-lg bg-white dark:bg-boxdark text-black dark:text-white ${
                searchQuery ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {statusFilters.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setDateFilter('');
              setSearchQuery('');
              setStatusFilter('');
            }}
            className="px-4 py-2 bg-gray-200 dark:bg-meta-4 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-meta-3"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-boxdark rounded-xl overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No FTD orders found for the selected filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-meta-4">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-semibold">Order #</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold">Status</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold">Customer</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold">Recipient</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold">Delivery</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold">Product</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-right">Amount</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4"
                  >
                    <td className="px-2 py-2 text-xs font-medium">
                      <div className="whitespace-nowrap">#{order.orderNumber}</div>
                      <div className="text-gray-500 text-[10px] mt-0.5">
                        {order.externalStatus || '—'}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <StatusBadge status={order.status as any} />
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <div className="max-w-[120px] truncate" title={
                        order.customer
                          ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim()
                          : 'Unknown'
                      }>
                        {order.customer
                          ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || 'Unknown'
                          : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <div className="max-w-[120px] truncate" title={
                        order.recipientCustomer
                          ? `${order.recipientCustomer.firstName ?? ''} ${order.recipientCustomer.lastName ?? ''}`.trim()
                          : order.deliveryAddress
                          ? `${order.deliveryAddress.firstName ?? ''} ${order.deliveryAddress.lastName ?? ''}`.trim()
                          : 'Unknown'
                      }>
                        {order.recipientCustomer
                          ? `${order.recipientCustomer.firstName ?? ''} ${order.recipientCustomer.lastName ?? ''}`.trim() || 'Unknown'
                          : order.deliveryAddress
                          ? `${order.deliveryAddress.firstName ?? ''} ${order.deliveryAddress.lastName ?? ''}`.trim()
                          : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs whitespace-nowrap">
                      {order.deliveryDate
                        ? formatDate(order.deliveryDate) || new Date(order.deliveryDate).toLocaleDateString()
                        : 'ASAP'}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <div className="max-w-[200px] truncate" title={renderProductSummary(order)}>
                        {renderProductSummary(order)}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs whitespace-nowrap text-right font-medium">
                      ${(order.paymentAmount / 100).toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-xs whitespace-nowrap">
                      <div className="flex gap-2">
                        <a
                          href={`/orders/${order.id}/edit`}
                          className="text-blue-500 hover:underline"
                        >
                          Edit
                        </a>
                        {order.ftdOrderId && (
                          <button
                            onClick={() => handleRefreshDetails(order.ftdOrderId)}
                            className="text-green-600 hover:underline"
                            title="Refresh FTD details"
                          >
                            🔄
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  count,
  color,
  onClick,
  active
}: {
  label: string;
  count: number;
  color: string;
  onClick: () => void;
  active?: boolean;
}) {
  const colors: Record<string, string> = {
    orange: 'border-l-warning-500',
    blue: 'border-l-blue-light-500',
    green: 'border-l-success-500',
    gray: 'border-l-gray-400'
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-boxdark rounded-xl p-4 border-l-4 ${colors[color]} cursor-pointer transition-all hover:shadow-lg ${
        active ? 'ring-2 ring-[#597485]' : ''
      }`}
    >
      <div className="text-2xl font-bold text-black dark:text-white">{count}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}
