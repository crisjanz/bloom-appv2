import React from 'react';
import Badge from '../ui/badge/Badge';
import { getStatusDisplayText } from '../../utils/orderStatusHelpers';
import { statusConfig } from './types';
import type { OrderStatus, OrderType } from '../../utils/orderStatusHelpers';

interface StatusBadgeProps {
  status: OrderStatus;
  orderType?: OrderType;
  className?: string;
}

/**
 * Smart status badge that displays the correct text based on order type
 * Uses COMPLETED status but shows "Delivered", "Picked Up", or "Completed" based on order type
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  orderType, 
  className 
}) => {
  const displayText = getStatusDisplayText(status, orderType);
  const config = statusConfig[status];

  if (!config) {
    return (
      <Badge color="default" className={className}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge color={config.color} className={className}>
      {displayText}
    </Badge>
  );
};

export default StatusBadge;