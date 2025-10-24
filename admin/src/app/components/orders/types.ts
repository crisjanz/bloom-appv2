import { 
  OrderStatus, 
  OrderType,
  getAllStatuses, 
  getStatusDisplayText, 
  getStatusColor 
} from '@shared/utils/orderStatusHelpers';
import type { OrderSource as DomainOrderSource } from '@domains/orders/entities/Order';

export interface Order {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  type: OrderType;
  createdAt: string;
  deliveryDate: string | null;
  deliveryTime: string | null;
  paymentAmount: number;
  deliveryFee: number;
  discount: number;
  gst: number;
  pst: number;
  cardMessage: string | null;
  specialInstructions: string | null;
  occasion: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  recipientCustomer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  deliveryAddress?: {
    id: string;
    firstName: string;
    lastName: string;
    company?: string;
    phone: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  orderItems: Array<{
    id: string;
    customName: string;
    unitPrice: number;
    quantity: number;
    rowTotal: number;
  }>;
  orderSource?: DomainOrderSource;
  images?: string[];
  taxBreakdown?: Array<{
    name: string;
    amount: number;
  }>;
}

// Generate status options for dropdowns using helper functions
export const statusOptions = getAllStatuses().map(status => ({
  value: status,
  label: getStatusDisplayText(status)
}));

// Badge color mapping for existing Badge components (supports both backend and frontend statuses)
const getBadgeColor = (status: OrderStatus): 'default' | 'info' | 'warning' | 'success' | 'error' => {
  switch (status) {
    case 'DRAFT':
      return 'default';
    case 'PENDING_PAYMENT':
      return 'warning';
    case 'PAID':
    case 'CONFIRMED':
      return 'info';
    case 'IN_DESIGN':
    case 'IN_PRODUCTION':
    case 'QUALITY_CHECK':
      return 'warning';
    case 'READY':
    case 'READY_FOR_PICKUP':
    case 'READY_FOR_DELIVERY':
    case 'OUT_FOR_DELIVERY':
      return 'success';
    case 'COMPLETED':
    case 'DELIVERED':
    case 'PICKED_UP':
      return 'success';
    case 'REJECTED':
    case 'CANCELLED':
    case 'FAILED_DELIVERY':
      return 'error';
    case 'REFUNDED':
      return 'default';
    default:
      return 'default';
  }
};

// All possible statuses (both backend and frontend)
const allPossibleStatuses: OrderStatus[] = [
  'DRAFT',
  'PENDING_PAYMENT',
  'PAID',
  'CONFIRMED',
  'IN_DESIGN',
  'IN_PRODUCTION',
  'QUALITY_CHECK',
  'READY',
  'READY_FOR_PICKUP',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'PICKED_UP',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'FAILED_DELIVERY',
  'REFUNDED'
];

// Generate status config using helper functions
export const statusConfig = Object.fromEntries(
  allPossibleStatuses.map(status => [
    status,
    {
      color: getBadgeColor(status),
      label: getStatusDisplayText(status),
      tailwindClasses: getStatusColor(status)
    }
  ])
) as Record<OrderStatus, {
  color: 'default' | 'info' | 'warning' | 'success' | 'error';
  label: string;
  tailwindClasses: string;
}>;
