// components/orders/edit/OrderHeader.tsx
import React from 'react';
import StatusSelect from '@shared/ui/forms/StatusSelect';
import { Order } from '../types';
import { getStatusOptions } from '@shared/utils/orderStatusHelpers';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import { PhoneIcon } from '@shared/assets/icons';

interface OrderHeaderProps {
  order: Order;
  onStatusChange: (status: string) => void;
  onCancelRefund?: () => void;
  onReceiptInvoice?: () => void;
  onContact?: () => void;
  unreadCount?: number;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({
  order,
  onStatusChange,
  onCancelRefund,
  onReceiptInvoice,
  onContact,
  unreadCount
}) => {
  const statusOptions = getStatusOptions(order.type);
  const { formatDate, loading: timezoneLoading } = useBusinessTimezone();
  const showUnreadBadge = typeof unreadCount === 'number' && unreadCount > 0;
  const unreadLabel = showUnreadBadge ? (unreadCount > 9 ? '9+' : `${unreadCount}`) : '';

  // Show Cancel/Refund button for orders that can be cancelled (not already cancelled/completed/refunded)
  const canCancelRefund = onCancelRefund && !['CANCELLED', 'COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(order.status);
  
  // Format order source for display
  const formatOrderSource = (source: string) => {
    const sourceMap: Record<string, string> = {
      'PHONE': 'Phone Order',
      'WALKIN': 'Walk-in Order',
      'EXTERNAL': 'External Order',
      'WEBSITE': 'Website Order',
      'POS': 'POS Order'
    };
    return sourceMap[source] || source;
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Order #{order.orderNumber}
            </h1>
            {order.orderSource && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {formatOrderSource(order.orderSource)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Created {timezoneLoading ? 'Loading...' : formatDate(new Date(order.createdAt))}
          </p>
        </div>
        
        {/* Status display and controls */}
        <div className="flex items-center gap-3">
          {onContact && (
            <button
              type="button"
              onClick={onContact}
              className="relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
            >
              <PhoneIcon className="w-4 h-4" />
              Contact
              {showUnreadBadge && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                  {unreadLabel}
                </span>
              )}
            </button>
          )}
          {onReceiptInvoice && (
            <button
              type="button"
              onClick={onReceiptInvoice}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Receipt/Invoice
            </button>
          )}
          {canCancelRefund && (
            <button
              type="button"
              onClick={onCancelRefund}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Cancel/Refund
            </button>
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Status:
          </span>
          <StatusSelect
            options={statusOptions}
            value={order.status}
            onChange={onStatusChange}
            orderType={order.type}
            placeholder="Change Status"
          />
        </div>
      </div>
    </div>
  );
};

export default OrderHeader;
