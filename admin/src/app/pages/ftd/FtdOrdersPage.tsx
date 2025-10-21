import React, { useState } from 'react';
import { useFtdOrders } from '../../../domains/ftd/hooks/useFtdOrders';
import { FtdOrderStatus } from '../../../domains/ftd/types/ftdTypes';

export default function FtdOrdersPage() {
  // Get today's date in YYYY-MM-DD format (Vancouver timezone)
  const getTodayDate = () => {
    const today = new Date();
    // Convert to Vancouver timezone
    const vancouverDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/Vancouver' }));
    const year = vancouverDate.getFullYear();
    const month = String(vancouverDate.getMonth() + 1).padStart(2, '0');
    const day = String(vancouverDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>(getTodayDate());
  const [dateTo, setDateTo] = useState<string>(getTodayDate());
  const { orders, stats, loading, updateOrder } = useFtdOrders({
    status: statusFilter,
    from: dateFrom,
    to: dateTo
  });
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async () => {
    setUpdating(true);
    await updateOrder();
    setUpdating(false);
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setDateFrom(getTodayDate());
    setDateTo(getTodayDate());
  };

  const handleStatCardClick = (status: string) => {
    if (status === 'all') {
      // Total Orders card - clear all filters
      setStatusFilter('');
      setDateFrom('');
      setDateTo('');
    } else {
      // Status card - set status filter, clear date filters to show all dates
      setStatusFilter(status);
      setDateFrom('');
      setDateTo('');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white">
            FTD Wire Orders
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Incoming wire orders from FTD network
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

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              <strong>How it works:</strong> Review orders here. Use <strong>FTD Live</strong> (in sidebar) to accept/reject in Mercury HQ.
              When you accept an order, Bloom will automatically create a POS order for fulfillment.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Needs Action" count={stats.needsAction} color="orange" onClick={() => handleStatCardClick('NEEDS_ACTION')} />
          <StatCard label="Accepted" count={stats.accepted} color="blue" onClick={() => handleStatCardClick('ACCEPTED')} />
          <StatCard label="Delivered" count={stats.delivered} color="green" onClick={() => handleStatCardClick('DELIVERED')} />
          <StatCard label="Total Orders" count={stats.totalOrders} color="gray" onClick={() => handleStatCardClick('all')} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-boxdark rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-stroke dark:border-strokedark rounded-lg bg-white dark:bg-boxdark text-black dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="NEEDS_ACTION">Needs Action</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="IN_DESIGN">In Design</option>
              <option value="DELIVERED">Delivered</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delivery From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-stroke dark:border-strokedark rounded-lg bg-white dark:bg-boxdark text-black dark:text-white"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delivery To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border border-stroke dark:border-strokedark rounded-lg bg-white dark:bg-boxdark text-black dark:text-white"
            />
          </div>

          {(statusFilter || dateFrom !== getTodayDate() || dateTo !== getTodayDate()) && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-stroke dark:border-strokedark rounded-lg bg-white dark:bg-boxdark transition-colors"
            >
              Reset to Today
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
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
                  <th className="px-3 py-3 text-left text-xs font-semibold">Recipient</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Location</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Delivery</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Amount</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Bloom</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4"
                  >
                    <td className="px-3 py-3 text-xs font-medium whitespace-nowrap">
                      {order.externalId?.split('-')[1] || order.externalId}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="max-w-[140px] truncate">
                        {order.recipientFirstName} {order.recipientLastName}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="max-w-[100px] truncate">{order.city}</div>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {order.deliveryDate
                        ? new Date(order.deliveryDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'ASAP'}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      ${order.totalAmount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {order.linkedOrder ? (
                        <a
                          href={`/orders`}
                          className="text-blue-500 hover:underline whitespace-nowrap"
                        >
                          #{order.linkedOrder.orderNumber}
                        </a>
                      ) : order.status === FtdOrderStatus.ACCEPTED ? (
                        <span className="text-gray-500">...</span>
                      ) : (
                        <span className="text-gray-400">—</span>
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    NEEDS_ACTION: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
    ACCEPTED: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500',
    IN_DESIGN: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
    READY: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
    OUT_FOR_DELIVERY: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    DELIVERED: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
    REJECTED: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
    CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status] || colors.NEEDS_ACTION}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function StatCard({ label, count, color, onClick }: { label: string; count: number; color: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    orange: 'border-l-warning-500',
    blue: 'border-l-blue-light-500',
    green: 'border-l-success-500',
    gray: 'border-l-gray-400',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-boxdark rounded-xl p-4 border-l-4 ${colors[color]} cursor-pointer transition-all hover:shadow-lg hover:scale-105 active:scale-95`}
    >
      <div className="text-2xl font-bold text-black dark:text-white">{count}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}
