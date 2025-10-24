export interface FtdOrder {
  id: string;
  orderNumber: number;
  status: string;
  externalStatus?: string | null;
  externalReference?: string | null;
  needsExternalUpdate: boolean;
  ftdOrderId?: string; // ID of the FtdOrder record for manual refresh
  importedPayload?: any;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  cardMessage?: string | null;
  specialInstructions?: string | null;
  occasion?: string | null;
  paymentAmount: number;
  customer?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  recipientCustomer?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  deliveryAddress?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    country: string | null;
    phone: string | null;
  } | null;
  orderItems: Array<{
    id: string;
    customName: string | null;
    unitPrice: number;
    quantity: number;
    rowTotal: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface FtdOrderStats {
  totalOrders: number;
  needsAction: number;
  accepted: number;
  delivered: number;
  totalRevenue: number;
  byStatus?: Array<{ status: string; count: number }>;
}
