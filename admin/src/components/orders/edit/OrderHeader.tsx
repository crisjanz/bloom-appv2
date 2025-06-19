// components/orders/edit/OrderHeader.tsx
import React from 'react';
import Select from '../../form/Select';
import { Order } from '../types';
import StatusBadge from '../StatusBadge';
import { getStatusOptions } from '../../../utils/orderStatusHelpers';

interface OrderHeaderProps {
  order: Order;
  onStatusChange: (status: string) => void;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({ order, onStatusChange }) => {
  const statusOptions = getStatusOptions(order.type);
  
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Order #{order.orderNumber}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Created {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        {/* Status display and controls */}
        <div className="flex items-center gap-4">
          {/* Smart status badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status:
            </span>
            <StatusBadge 
              status={order.status}
              orderType={order.type}
            />
          </div>
          
          {/* Status change dropdown */}
          <div className="min-w-[180px]">
            <Select
              options={statusOptions}
              value={order.status}
              onChange={onStatusChange}
              placeholder="Change Status"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderHeader;