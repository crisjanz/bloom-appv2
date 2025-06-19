import { 
  OrderStatus, 
  OrderType,
  getAllStatuses, 
  getStatusDisplayText, 
  getStatusColor 
} from '../../utils/orderStatusHelpers';

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
  recipient?: {
    id: string;
    firstName: string;
    lastName: string;
    company: string;
    phone: string;
    address1: string;
    address2: string;
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
  images?: string[];
}

// Generate status options for dropdowns using helper functions
export const statusOptions = getAllStatuses().map(status => ({
  value: status,
  label: getStatusDisplayText(status)
}));

// Badge color mapping for existing Badge components
const getBadgeColor = (status: OrderStatus): 'default' | 'info' | 'warning' | 'success' | 'error' => {
  switch (status) {
    case 'DRAFT':
      return 'default';
    case 'PAID':
      return 'info';
    case 'IN_DESIGN':
      return 'warning';
    case 'READY':
    case 'OUT_FOR_DELIVERY':
    case 'COMPLETED':
      return 'success';
    case 'REJECTED':
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
};

// Generate status config using helper functions
export const statusConfig = Object.fromEntries(
  getAllStatuses().map(status => [
    status,
    {
      color: getBadgeColor(status),
      label: getStatusDisplayText(status),
      tailwindClasses: getStatusColor(status) // Add Tailwind classes for new components
    }
  ])
) as Record<OrderStatus, { 
  color: 'default' | 'info' | 'warning' | 'success' | 'error';
  label: string;
  tailwindClasses: string;
}>;