import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import Badge from '../../../components/ui/badge/Badge';
import Select from '../../../components/form/Select';
import { Order, statusConfig, statusOptions } from '../types';

interface OrderHeaderProps {
  order: Order;
  onStatusChange: (status: string) => void;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({ order, onStatusChange }) => {
  const navigate = useNavigate();
  const [isEditingStatus, setIsEditingStatus] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA');
  };

  const getCurrentStatusColor = () => {
    const status = statusConfig[order.status as keyof typeof statusConfig];
    return status?.color || 'default';
  };

  const handleStatusChange = (newStatus: string) => {
    onStatusChange(newStatus);
    setIsEditingStatus(false);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Order #{order.orderNumber}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Created on {formatDate(order.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isEditingStatus ? (
            <div className="min-w-[150px]">
              <Select
                options={statusOptions}
                value={order.status}
                onChange={handleStatusChange}
                placeholder="Select Status"
                className="dark:bg-gray-700"
              />
            </div>
          ) : (
            <>
              <Badge size="sm" color={getCurrentStatusColor()}>
                {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
              </Badge>
              <button
                onClick={() => setIsEditingStatus(true)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Edit Status"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </>
          )}
        </div>
        <button
          onClick={() => navigate('/orders')}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back to Orders
        </button>
      </div>
    </div>
  );
};

export default OrderHeader;