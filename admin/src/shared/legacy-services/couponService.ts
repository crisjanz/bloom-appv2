// src/services/couponService.ts
import type { Coupon, CouponValidationResult, CouponFormData, CouponSource, DiscountType } from '../types/coupon';

const API_BASE_URL = '/api';

const normaliseDiscountType = (value: any): DiscountType => {
  if (value === 'PERCENTAGE' || value === 'FIXED_AMOUNT' || value === 'FREE_SHIPPING') {
    return value;
  }
  return 'PERCENTAGE';
};

const toDate = (value: any | null | undefined): Date | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const toNumberArray = (values: any): string[] => {
  if (!Array.isArray(values)) return [];
  return values.map((item) => String(item));
};

const mapDiscountToCoupon = (discount: any, fallbackCode: string): Coupon => {
  const createdAt = toDate(discount?.createdAt) ?? new Date();
  const updatedAt = toDate(discount?.updatedAt) ?? createdAt;

  return {
    id: String(discount?.id ?? fallbackCode),
    code: String(discount?.code ?? fallbackCode),
    name: String(discount?.name ?? fallbackCode),
    description: typeof discount?.description === 'string' ? discount.description : undefined,
    discountType: normaliseDiscountType(discount?.discountType),
    value: Number(discount?.value ?? 0),
    usageLimit: discount?.usageLimit != null ? Number(discount.usageLimit) : undefined,
    usageCount: Number(discount?.usageCount ?? 0),
    perCustomerLimit: discount?.perCustomerLimit != null ? Number(discount.perCustomerLimit) : undefined,
    startDate: toDate(discount?.startDate),
    endDate: toDate(discount?.endDate),
    minimumOrder: discount?.minimumOrder != null ? Number(discount.minimumOrder) : undefined,
    applicableProducts: toNumberArray(discount?.applicableProducts),
    applicableCategories: toNumberArray(discount?.applicableCategories),
    posOnly: Boolean(discount?.posOnly),
    webOnly: Boolean(discount?.webOnly),
    enabled: discount?.enabled !== false,
    createdAt,
    updatedAt,
  };
};

// Validation Service
export const validateCoupon = async (
  code: string,
  orderTotal: number,
  options: {
    customerId?: string;
    productIds?: string[];
    categoryIds?: string[];
    source: CouponSource;
  }
): Promise<CouponValidationResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/discounts/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code.trim(),
        cartItems: options.productIds?.map(id => ({
          id,
          categoryId: options.categoryIds?.find(catId => catId), // This might need better mapping
          quantity: 1,
          price: orderTotal / (options.productIds?.length || 1) // Rough estimate
        })) || [],
        customerId: options.customerId,
        source: options.source
      }),
    });

    const result = await response.json();
    
    // Transform new discount API response to match old coupon format
    if (result.valid && result.discount) {
      return {
        valid: true,
        coupon: mapDiscountToCoupon(result.discount, code.trim()),
        discountAmount: result.discountAmount || 0
      };
    } else {
      return {
        valid: false,
        error: result.error || 'Invalid discount code',
        errorCode: 'NOT_FOUND'
      };
    }
  } catch (error) {
    console.error('Error validating coupon:', error);
    return {
      valid: false,
      error: 'Network error - please try again',
      errorCode: 'NOT_FOUND'
    };
  }
};

// Apply Coupon Service
export const applyCoupon = async (
  couponId: string,
  orderId: string,
  options: {
    customerId?: string;
    employeeId?: string;
    source: CouponSource;
  }
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/coupons/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        couponId,
        orderId,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to apply coupon');
    }

    return await response.json();
  } catch (error) {
    console.error('Error applying coupon:', error);
    throw error;
  }
};

// CRUD Services for Settings Management
export const fetchCoupons = async (): Promise<Coupon[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/coupons`);
    if (!response.ok) {
      throw new Error('Failed to fetch coupons');
    }
    const data = await response.json();
    return Array.isArray(data) ? data.map((discount) => mapDiscountToCoupon(discount, discount.code ?? discount.id ?? '')) : [];
  } catch (error) {
    console.error('Error fetching coupons:', error);
    throw error;
  }
};

export const createCoupon = async (data: CouponFormData): Promise<Coupon> => {
  try {
    const response = await fetch(`${API_BASE_URL}/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create coupon');
    }

    const payload = await response.json();
    return mapDiscountToCoupon(payload, payload.code ?? payload.id ?? data.code);
  } catch (error) {
    console.error('Error creating coupon:', error);
    throw error;
  }
};

export const updateCoupon = async (id: string, data: Partial<CouponFormData>): Promise<Coupon> => {
  try {
    const response = await fetch(`${API_BASE_URL}/coupons/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update coupon');
    }

    const payload = await response.json();
    return mapDiscountToCoupon(payload, payload.code ?? id);
  } catch (error) {
    console.error('Error updating coupon:', error);
    throw error;
  }
};

export const deleteCoupon = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/coupons/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete coupon');
    }
  } catch (error) {
    console.error('Error deleting coupon:', error);
    throw error;
  }
};
