export interface Order {
  id: string;
  orderNumber: number;
  status: string;
  type: string;
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

export const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PAID', label: 'Paid' },
  { value: 'IN_DESIGN', label: 'In Design' },
  { value: 'READY', label: 'Ready for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const statusConfig = {
  DRAFT: { color: 'default', label: 'Draft' },
  PAID: { color: 'info', label: 'Paid' },
  IN_DESIGN: { color: 'warning', label: 'In Design' },
  READY: { color: 'success', label: 'Ready' },
  DELIVERED: { color: 'success', label: 'Delivered' },
  COMPLETED: { color: 'success', label: 'Completed' },
  REJECTED: { color: 'error', label: 'Rejected' },
  CANCELLED: { color: 'error', label: 'Cancelled' },
} as const;