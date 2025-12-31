// Standard status colors across the entire application
// Use these consistently for all status indicators (dots, badges, text, etc.)

export type StatusColor =
  | 'gray'
  | 'blue'
  | 'yellow'
  | 'purple'
  | 'indigo'
  | 'green'
  | 'red'
  | 'orange';

export const STATUS_COLORS = {
  gray: 'text-gray-500',
  blue: 'text-blue-500',
  yellow: 'text-yellow-600',
  purple: 'text-purple-500',
  indigo: 'text-indigo-500',
  green: 'text-green-500',
  red: 'text-red-500',
  orange: 'text-orange-500',
} as const;

/**
 * Get standardized color for order statuses
 */
export const getOrderStatusColor = (status: string): string => {
  switch (status) {
    case 'DRAFT':
      return STATUS_COLORS.gray;
    case 'PAID':
      return STATUS_COLORS.blue;
    case 'IN_DESIGN':
      return STATUS_COLORS.yellow;
    case 'READY':
    case 'READY_FOR_DELIVERY':
    case 'READY_FOR_PICKUP':
      return STATUS_COLORS.purple;
    case 'OUT_FOR_DELIVERY':
      return STATUS_COLORS.indigo;
    case 'COMPLETED':
    case 'DELIVERED':
    case 'PICKED_UP':
      return STATUS_COLORS.green;
    case 'CANCELLED':
      return STATUS_COLORS.red;
    case 'REJECTED':
      return STATUS_COLORS.orange;
    default:
      return STATUS_COLORS.gray;
  }
};

/**
 * Get standardized color for event statuses
 */
export const getEventStatusColor = (status: string): string => {
  switch (status) {
    case 'INQUIRY':
    case 'QUOTE_REQUESTED':
      return STATUS_COLORS.blue;
    case 'QUOTE_SENT':
      return STATUS_COLORS.yellow;
    case 'QUOTE_APPROVED':
    case 'DEPOSIT_RECEIVED':
      return STATUS_COLORS.green;
    case 'IN_PRODUCTION':
    case 'READY_FOR_INSTALL':
      return STATUS_COLORS.purple;
    case 'INSTALLED':
    case 'COMPLETED':
      return STATUS_COLORS.green;
    case 'CANCELLED':
    case 'REJECTED':
      return STATUS_COLORS.red;
    default:
      return STATUS_COLORS.gray;
  }
};

/**
 * Get standardized color for payment/transaction statuses
 */
export const getPaymentStatusColor = (status: string): string => {
  switch (status) {
    case 'PENDING':
    case 'PROCESSING':
      return STATUS_COLORS.yellow;
    case 'COMPLETED':
      return STATUS_COLORS.green;
    case 'FAILED':
      return STATUS_COLORS.red;
    case 'CANCELLED':
      return STATUS_COLORS.orange;
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return STATUS_COLORS.purple;
    default:
      return STATUS_COLORS.gray;
  }
};

/**
 * Get standardized color for gift card statuses
 */
export const getGiftCardStatusColor = (status: string): string => {
  switch (status) {
    case 'ACTIVE':
    case 'USED':
      return STATUS_COLORS.green;
    case 'INACTIVE':
      return STATUS_COLORS.yellow;
    case 'EXPIRED':
    case 'CANCELLED':
      return STATUS_COLORS.red;
    default:
      return STATUS_COLORS.gray;
  }
};

