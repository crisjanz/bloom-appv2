// src/types/coupon.ts

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
export type CouponSource = 'POS' | 'WEBSITE';

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  
  // Usage limits
  usageLimit?: number;
  usageCount: number;
  perCustomerLimit?: number;
  
  // Date restrictions
  startDate?: Date;
  endDate?: Date;
  
  // Order requirements
  minimumOrder?: number;
  
  // Product/Category restrictions
  applicableProducts: string[];
  applicableCategories: string[];
  
  // Channel restrictions
  posOnly: boolean;
  webOnly: boolean;
  
  // Status
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  customerId?: string;
  orderId?: string;
  employeeId?: string;
  source: CouponSource;
  usedAt: Date;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  discountAmount?: number;
  discountType?: '$' | '%' | 'shipping';
  error?: string;
  errorCode?: 'NOT_FOUND' | 'EXPIRED' | 'USAGE_LIMIT' | 'MINIMUM_ORDER' | 'DISABLED' | 'CUSTOMER_LIMIT';
}

export interface CouponFormData {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  startDate?: string; // HTML date input format
  endDate?: string;
  minimumOrder?: number;
  applicableProducts: string[];
  applicableCategories: string[];
  posOnly: boolean;
  webOnly: boolean;
  enabled: boolean;
}

// For the PaymentCard component integration
export interface AppliedCoupon {
  code: string;
  discountAmount: number;
  discountType: '$' | '%' | 'shipping';
  couponId: string;
}