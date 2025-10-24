import React, { useState } from 'react';
import { useFtdOrders } from '../../../domains/ftd/hooks/useFtdOrders';
import { FtdOrder } from '../../../domains/ftd/types/ftdTypes';
import StatusBadge from '@app/components/orders/StatusBadge';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';

const statusFilters = [
  { value: '', label: 'All statuses' },
  { value: 'NEW', label: 'Needs Action' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'ACKNOWLEDGE_PRINT', label: 'Printed' },
  { value: 'DESIGN', label: 'Design' },
  { value: 'DESIGNED', label: 'Ready' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

export default function FtdOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [showNeedsUpdate, setShowNeedsUpdate] = useState(false);
  const { orders, stats, loading, updateOrder, refresh } = useFtdOrders({
    status: statusFilter,
    needsUpdate: showNeedsUpdate
  });
  const [updating, setUpdating] = useState(false);
  const { formatDate } = useBusinessTimezone();

  const handleUpdate = async () => {
    setUpdating(true);
    await updateOrder();
    setUpdating(false);
  };

  const handleMarkReviewed = async (orderId: string) => {
    await fetch(`/api/ftd/orders/${orderId}/approve`, { method: 'POST' });
    refresh();
  };

  const renderProductSummary = (order: FtdOrder) => {
    const description = order.importedPayload?.productDescription || order.orderItems?.[0]?.customName;
    return description || '—';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white">FTD Wire Orders</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Incoming wire orders from the FTD network. Orders flagged as "Needs update" require manual review.
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
          <StatCard label="Needs Action" count={stats.needsAction} color="orange" />
          <StatCard label="Accepted" count={stats.accepted} color="blue" />
          <StatCard label="Delivered" count={stats.delivered} color="green" />
          <StatCard label="Total Orders" count={stats.totalOrders} color="gray" />
        </div>
      )}

      <div className="bg-white dark:bg-boxdark rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              FTD Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-stroke dark:border-strokedark rounded-lg bg-white dark:bg-boxdark text-black dark:text-white"
            >
              {statusFilters.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showNeedsUpdate}
              onChange={(e) => setShowNeedsUpdate(e.target.checked)}
              className="rounded border-gray-300 text-[#597485] focus:ring-[#597485]"
            />
            Needs update only
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-boxdark rounded-xl overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No FTD orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50 dark:bg-meta-4">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Order #</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Bloom Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">FTD Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Customer</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Recipient</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Delivery</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Product</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Amount</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Flags</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4"
                  >
                    <td className="px-3 py-3 text-xs font-medium whitespace-nowrap">
                      #{order.orderNumber}
                      <div className="text-gray-500 text-[11px]">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {order.externalStatus || '—'}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="max-w-[140px] truncate">
                        {order.customer
                          ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || 'Unknown'
                          : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="max-w-[140px] truncate">
                        {order.recipientCustomer
                          ? `${order.recipientCustomer.firstName ?? ''} ${order.recipientCustomer.lastName ?? ''}`.trim() || 'Unknown'
                          : order.deliveryAddress
                          ? `${order.deliveryAddress.firstName ?? ''} ${order.deliveryAddress.lastName ?? ''}`.trim()
                          : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {order.deliveryDate
                        ? formatDate(order.deliveryDate) || new Date(order.deliveryDate).toLocaleDateString()
                        : 'ASAP'}
                    </td>
                    <td className="px-3 py-3 text-xs max-w-[180px] truncate">
                     {renderProductSummary(order)}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      ${order.paymentAmount.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {order.needsExternalUpdate && (
                        <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 text-[10px] font-semibold">
                          Needs update
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap space-x-2">
                      <a
                        href={`/orders/${order.id}/edit`}
                        className="text-blue-500 hover:underline"
                      >
                        Edit
                      </a>
                      {order.needsExternalUpdate && (
                        <button
                          onClick={() => handleMarkReviewed(order.id)}
                          className="text-[#597485] hover:underline"
                        >
                          Mark reviewed
                        </button>
                      )}
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

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    orange: 'border-l-warning-500',
    blue: 'border-l-blue-light-500',
    green: 'border-l-success-500',
    gray: 'border-l-gray-400'
  };

  return (
    <div
      className={`bg-white dark:bg-boxdark rounded-xl p-4 border-l-4 ${colors[color]} cursor-default`}
    >
      <div className="text-2xl font-bold text-black dark:text-white">{count}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}
