// Order Status Display and Management Utilities

export type OrderStatus = 
  | 'DRAFT'
  | 'PAID' 
  | 'IN_DESIGN'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export type OrderType = 'DELIVERY' | 'PICKUP';

/**
 * Get display text for order status based on order type
 */
export const getStatusDisplayText = (status: OrderStatus, orderType?: OrderType): string => {
  if (status === 'COMPLETED') {
    switch (orderType) {
      case 'PICKUP':
        return 'Picked Up';
      case 'DELIVERY':
        return 'Delivered';
      default:
        return 'Completed'; // POS walk-in orders
    }
  }
  
  if (status === 'READY') {
    switch (orderType) {
      case 'PICKUP':
        return 'Ready for Pickup';
      case 'DELIVERY':
        return 'Ready for Delivery';
      default:
        return 'Ready'; // POS walk-in orders
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
      return 'Out for Delivery';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status;
  }
};

/**
 * Get status color for badges/indicators
 */
export const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800';
    case 'PAID':
      return 'bg-blue-100 text-blue-800';
    case 'IN_DESIGN':
      return 'bg-yellow-100 text-yellow-800';
    case 'READY':
      return 'bg-purple-100 text-purple-800';
    case 'OUT_FOR_DELIVERY':
      return 'bg-indigo-100 text-indigo-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'REJECTED':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
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
      return [];
    
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
    'CANCELLED'
  ];
};

/**
 * Check if status is a final state
 */
export const isFinalStatus = (status: OrderStatus): boolean => {
  return ['COMPLETED', 'CANCELLED'].includes(status);
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