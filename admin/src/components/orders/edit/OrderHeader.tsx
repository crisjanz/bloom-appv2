// components/orders/edit/OrderHeader.tsx
import React from 'react';
import Select from '../../form/Select';
import { Order } from '../types';

interface OrderHeaderProps {
  order: Order;
  onStatusChange: (status: string) => void;
}

const statusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "PAID", label: "Paid" },
  { value: "IN_DESIGN", label: "In Design" },
  { value: "READY", label: "Ready" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

const OrderHeader: React.FC<OrderHeaderProps> = ({ order, onStatusChange }) => {
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
        
        {/* Always visible status dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Status:
          </span>
          <div className="min-w-[150px]">
            <Select
              options={statusOptions}
              value={order.status}
              onChange={onStatusChange}
              placeholder="Select Status"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderHeader;