import React from 'react';
import Badge from '@shared/ui/components/ui/badge/Badge';
import { getStatusDisplayText } from '@shared/utils/orderStatusHelpers';
import { statusConfig } from './types';
import type { OrderStatus, OrderType } from '@shared/utils/orderStatusHelpers';

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

  // Map status config colors to valid Badge colors
  const mapToBadgeColor = (statusColor: string) => {
    switch (statusColor) {
      case 'default': return 'light';
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'success': return 'success';
      case 'error': return 'error';
      default: return 'light';
    }
  };

  if (!config) {
    return (
      <Badge color="light" className={className}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge color={mapToBadgeColor(config.color)} className={className}>
      {displayText}
    </Badge>
  );
};

export default StatusBadge;