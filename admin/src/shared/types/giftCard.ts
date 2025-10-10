export interface GiftCard {
  id: string;
  cardNumber: string;
  type: 'PHYSICAL' | 'DIGITAL';
  initialValue: number;
  currentBalance: number;
  purchasedBy?: string;
  recipientEmail?: string;
  recipientName?: string;
  message?: string;
  status: 'INACTIVE' | 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
  expirationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GiftCardTransaction {
  id: string;
  giftCardId: string;
  orderId?: string;
  type: 'PURCHASE' | 'REDEMPTION' | 'REFUND' | 'ACTIVATION';
  amount: number;
  balanceAfter: number;
  notes?: string;
  employeeId?: string;
  createdAt: Date;
}

export interface GiftCardCheckResult {
  valid: boolean;
  cardNumber?: string;
  balance?: number;
  initialValue?: number;
  status?: string;
  error?: string;
}

export interface GiftCardRedeemResult {
  success: boolean;
  amountRedeemed?: number;
  remainingBalance?: number;
  cardNumber?: string;
  error?: string;
}