// Order Status Display and Management Utilities

// Backend statuses (database level)
export type BackendOrderStatus =
  | 'DRAFT'
  | 'PAID'
  | 'IN_DESIGN'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

// Frontend statuses (domain level - more detailed)
export type FrontendOrderStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CONFIRMED'
  | 'IN_DESIGN'
  | 'IN_PRODUCTION'
  | 'QUALITY_CHECK'
  | 'READY_FOR_PICKUP'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'FAILED_DELIVERY'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

// Union type that accepts both backend and frontend statuses
export type OrderStatus = BackendOrderStatus | FrontendOrderStatus;

export type OrderType = 'DELIVERY' | 'PICKUP';

/**
 * Get display text for order status (supports both backend and frontend statuses)
 */
export const getStatusDisplayText = (status: OrderStatus, orderType?: OrderType): string => {
  // Handle frontend detailed statuses
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'Pending Payment';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'IN_PRODUCTION':
      return 'In Production';
    case 'QUALITY_CHECK':
      return 'Quality Check';
    case 'READY_FOR_PICKUP':
      return 'Ready for PU';
    case 'READY_FOR_DELIVERY':
      return 'Ready for Del.';
    case 'DELIVERED':
      return 'Delivered';
    case 'PICKED_UP':
      return 'Picked Up';
    case 'FAILED_DELIVERY':
      return 'Failed Del.';
    case 'REFUNDED':
      return 'Refunded';
    case 'PARTIALLY_REFUNDED':
      return 'Partially Refunded';
  }

  // Handle backend statuses with order type context
  if (status === 'COMPLETED') {
    switch (orderType) {
      case 'PICKUP':
        return 'Picked Up';
      case 'DELIVERY':
        return 'Delivered';
      default:
        return 'Completed';
    }
  }

  if (status === 'READY') {
    switch (orderType) {
      case 'PICKUP':
        return 'Ready for PU';
      case 'DELIVERY':
        return 'Ready for Del.';
      default:
        return 'Ready';
    }
  }

  // Format other statuses for display
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'PAID':
      return 'Paid';
    case 'IN_DESIGN':
      return 'In Design';
    case 'OUT_FOR_DELIVERY':
      return 'Out for Del.';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status;
  }
};

/**
 * Get status color for badges/indicators (supports both backend and frontend statuses)
 */
export const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    case 'PENDING_PAYMENT':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'PAID':
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'IN_DESIGN':
    case 'IN_PRODUCTION':
    case 'QUALITY_CHECK':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'READY':
    case 'READY_FOR_PICKUP':
    case 'READY_FOR_DELIVERY':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'OUT_FOR_DELIVERY':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
    case 'COMPLETED':
    case 'DELIVERED':
    case 'PICKED_UP':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'REJECTED':
    case 'FAILED_DELIVERY':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'REFUNDED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    case 'PARTIALLY_REFUNDED':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
  }
};

/**
 * Get next possible status transitions for a given status
 */
export const getNextStatuses = (currentStatus: OrderStatus, orderType?: OrderType): OrderStatus[] => {
  switch (currentStatus) {
    case 'DRAFT':
      return ['PAID', 'CANCELLED'];
    
    case 'PAID':
      return ['IN_DESIGN', 'COMPLETED', 'CANCELLED']; // COMPLETED for POS walk-ins
    
    case 'IN_DESIGN':
      return ['READY', 'REJECTED', 'CANCELLED'];
    
    case 'READY':
      if (orderType === 'DELIVERY') {
        return ['OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'];
      } else {
        return ['COMPLETED', 'CANCELLED']; // Pickup orders skip OUT_FOR_DELIVERY
      }
    
    case 'OUT_FOR_DELIVERY':
      return ['COMPLETED', 'CANCELLED'];
    
    case 'REJECTED':
      return ['IN_DESIGN', 'CANCELLED'];
    
    // Final states - no transitions
    case 'COMPLETED':
    case 'CANCELLED':
    case 'REFUNDED':
      return [];
    case 'PARTIALLY_REFUNDED':
      return ['REFUNDED'];
    
    default:
      return [];
  }
};

/**
 * Check if a status transition is valid
 */
export const isValidStatusTransition = (
  fromStatus: OrderStatus, 
  toStatus: OrderStatus, 
  orderType?: OrderType
): boolean => {
  const allowedNextStatuses = getNextStatuses(fromStatus, orderType);
  return allowedNextStatuses.includes(toStatus);
};

/**
 * Get all possible statuses in workflow order
 */
export const getAllStatuses = (): OrderStatus[] => {
  return [
    'DRAFT',
    'PAID',
    'IN_DESIGN',
    'READY', 
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'REJECTED',
    'CANCELLED',
    'REFUNDED',
    'PARTIALLY_REFUNDED'
  ];
};

/**
 * Check if status is a final state
 */
export const isFinalStatus = (status: OrderStatus): boolean => {
  return ['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(status);
};

/**
 * Check if status is an active/working state
 */
export const isActiveStatus = (status: OrderStatus): boolean => {
  return ['DRAFT', 'PAID', 'IN_DESIGN', 'READY', 'OUT_FOR_DELIVERY'].includes(status);
};

/**
 * Get status progress percentage (for progress bars)
 */
export const getStatusProgress = (status: OrderStatus, orderType?: OrderType): number => {
  switch (status) {
    case 'DRAFT':
      return 10;
    case 'PAID':
      return 25;
    case 'IN_DESIGN':
      return 50;
    case 'READY':
      return 75;
    case 'OUT_FOR_DELIVERY':
      return 90;
    case 'COMPLETED':
      return 100;
    case 'CANCELLED':
    case 'REJECTED':
      return 0;
    default:
      return 0;
  }
};

/**
 * Get dropdown options for status select based on order type
 */
export const getStatusOptions = (orderType?: OrderType) => {
  const allStatuses = getAllStatuses();
  
  // Filter out OUT_FOR_DELIVERY for pickup orders
  const filteredStatuses = orderType === 'PICKUP' 
    ? allStatuses.filter(status => status !== 'OUT_FOR_DELIVERY')
    : allStatuses;
  
  return filteredStatuses.map(status => ({
    value: status,
    label: getStatusDisplayText(status, orderType)
  }));
};
