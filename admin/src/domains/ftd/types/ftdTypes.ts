export enum FtdOrderStatus {
  NEEDS_ACTION = "NEEDS_ACTION",
  ACCEPTED = "ACCEPTED",
  IN_DESIGN = "IN_DESIGN",
  READY = "READY",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export interface FtdOrder {
  id: string;
  externalId: string;
  ftdOrderNumber?: number;
  status: FtdOrderStatus;

  // Recipient
  recipientFirstName?: string;
  recipientLastName?: string;
  recipientPhone?: string;
  recipientEmail?: string;

  // Address
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country: string;
  addressType?: string;

  // Delivery
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryInstructions?: string;

  // Content
  cardMessage?: string;
  occasion?: string;
  productDescription?: string;
  productCode?: string;

  // Pricing
  totalAmount?: number;

  // Reporting
  sendingFloristCode?: string;

  // Integration
  linkedOrderId?: string;
  linkedOrder?: {
    id: string;
    orderNumber: number;
    status: string;
  };

  // Notifications
  notificationSent: boolean;
  notificationSentAt?: string;

  // Timestamps
  lastCheckedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FtdOrderStats {
  totalOrders: number;
  needsAction: number;
  accepted: number;
  delivered: number;
  totalRevenue: number;
  byStatus: Array<{
    status: string;
    _count: number;
  }>;
}
