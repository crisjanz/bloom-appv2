// src/routes/coupons/validate.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { CouponValidationResult } from '../../types/coupon';

const prisma = new PrismaClient();

interface ValidateRequest {
  code: string;
  customerId?: string;
  orderTotal: number;
  productIds?: string[];
  categoryIds?: string[];
  source: 'POS' | 'WEBSITE';
}

export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { code, customerId, orderTotal, productIds = [], categoryIds = [], source }: ValidateRequest = req.body;

    if (!code) {
      return res.status(400).json({
        valid: false,
        error: 'Coupon code is required',
        errorCode: 'NOT_FOUND'
      } as CouponValidationResult);
    }

    // Find the coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        usages: customerId ? {
          where: { customerId }
        } : undefined
      }
    });

    if (!coupon) {
      return res.status(404).json({
        valid: false,
        error: 'Coupon code not found',
        errorCode: 'NOT_FOUND'
      } as CouponValidationResult);
    }

    // Check if coupon is enabled
    if (!coupon.enabled) {
      return res.status(400).json({
        valid: false,
        error: 'This coupon is no longer available',
        errorCode: 'DISABLED'
      } as CouponValidationResult);
    }

    // Check date restrictions
    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return res.status(400).json({
        valid: false,
        error: 'This coupon is not yet valid',
        errorCode: 'EXPIRED'
      } as CouponValidationResult);
    }

    if (coupon.endDate && now > coupon.endDate) {
      return res.status(400).json({
        valid: false,
        error: 'This coupon has expired',
        errorCode: 'EXPIRED'
      } as CouponValidationResult);
    }

    // Check channel restrictions
    if (coupon.posOnly && source === 'WEBSITE') {
      return res.status(400).json({
        valid: false,
        error: 'This coupon can only be used in-store',
        errorCode: 'DISABLED'
      } as CouponValidationResult);
    }

    if (coupon.webOnly && source === 'POS') {
      return res.status(400).json({
        valid: false,
        error: 'This coupon can only be used online',
        errorCode: 'DISABLED'
      } as CouponValidationResult);
    }

    // Check usage limits
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        valid: false,
        error: 'This coupon has reached its usage limit',
        errorCode: 'USAGE_LIMIT'
      } as CouponValidationResult);
    }

    // Check per-customer usage limit
    if (coupon.perCustomerLimit && customerId && coupon.usages) {
      const customerUsageCount = coupon.usages.length;
      if (customerUsageCount >= coupon.perCustomerLimit) {
        return res.status(400).json({
          valid: false,
          error: 'You have already used this coupon the maximum number of times',
          errorCode: 'CUSTOMER_LIMIT'
        } as CouponValidationResult);
      }
    }

    // Check minimum order requirement
    if (coupon.minimumOrder && orderTotal < coupon.minimumOrder) {
      return res.status(400).json({
        valid: false,
        error: `Minimum order of $${coupon.minimumOrder.toFixed(2)} required for this coupon`,
        errorCode: 'MINIMUM_ORDER'
      } as CouponValidationResult);
    }

    // Check product/category restrictions
    if (coupon.applicableProducts.length > 0) {
      const hasApplicableProduct = productIds.some(id => coupon.applicableProducts.includes(id));
      if (!hasApplicableProduct) {
        return res.status(400).json({
          valid: false,
          error: 'This coupon is not applicable to the products in your order',
          errorCode: 'DISABLED'
        } as CouponValidationResult);
      }
    }

    if (coupon.applicableCategories.length > 0) {
      const hasApplicableCategory = categoryIds.some(id => coupon.applicableCategories.includes(id));
      if (!hasApplicableCategory) {
        return res.status(400).json({
          valid: false,
          error: 'This coupon is not applicable to the products in your order',
          errorCode: 'DISABLED'
        } as CouponValidationResult);
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    let discountType: '$' | '%' | 'shipping' = '$';

    switch (coupon.discountType) {
      case 'PERCENTAGE':
        discountAmount = (orderTotal * coupon.value) / 100;
        discountType = '%';
        break;
      case 'FIXED_AMOUNT':
        discountAmount = Math.min(coupon.value, orderTotal); // Don't exceed order total
        discountType = '$';
        break;
      case 'FREE_SHIPPING':
        discountAmount = 0; // Will be handled in delivery calculation
        discountType = 'shipping';
        break;
    }

    return res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        discountType: coupon.discountType,
        value: coupon.value,
        usageCount: coupon.usageCount,
        usageLimit: coupon.usageLimit,
        perCustomerLimit: coupon.perCustomerLimit,
        startDate: coupon.startDate,
        endDate: coupon.endDate,
        minimumOrder: coupon.minimumOrder,
        applicableProducts: coupon.applicableProducts,
        applicableCategories: coupon.applicableCategories,
        posOnly: coupon.posOnly,
        webOnly: coupon.webOnly,
        enabled: coupon.enabled,
        createdAt: coupon.createdAt,
        updatedAt: coupon.updatedAt
      },
      discountAmount,
      discountType
    } as CouponValidationResult);

  } catch (error) {
    console.error('Error validating coupon:', error);
    return res.status(500).json({
      valid: false,
      error: 'Internal server error',
      errorCode: 'NOT_FOUND'
    } as CouponValidationResult);
  }
};