// components/orders/edit/OrderHeader.tsx
import React from 'react';
import StatusSelect from '@shared/ui/forms/StatusSelect';
import { Order } from '../types';
import { getStatusOptions } from '@shared/utils/orderStatusHelpers';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';

interface OrderHeaderProps {
  order: Order;
  onStatusChange: (status: string) => void;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({ order, onStatusChange }) => {
  const statusOptions = getStatusOptions(order.type);
  const { formatDate, loading: timezoneLoading } = useBusinessTimezone();
  
  // Format order source for display
  const formatOrderSource = (source: string) => {
    const sourceMap: Record<string, string> = {
      'PHONE': 'Phone Order',
      'WALKIN': 'Walk-in Order',
      'WIREIN': 'Wire-In Order',
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