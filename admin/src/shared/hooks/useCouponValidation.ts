// src/hooks/useCouponValidation.ts
import { useState, useCallback } from 'react';
import { validateCoupon as validateCouponAPI } from '../legacy-services/couponService';
import type { CouponValidationResult, CouponSource } from '../types/coupon';

export const useCouponValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<CouponValidationResult | null>(null);

  const validateCoupon = useCallback(async (
    code: string,
    orderTotal: number,
    options: {
      customerId?: string;
      productIds?: string[];
      categoryIds?: string[];
      source: CouponSource;
    }
  ) => {
    if (!code.trim()) {
      setValidationResult(null);
      return null;
    }

    setIsValidating(true);
    
    try {
      const result = await validateCouponAPI(code, orderTotal, options);
      setValidationResult(result);
      return result;
    } catch (error) {
      const errorResult: CouponValidationResult = {
        valid: false,
        error: 'Failed to validate coupon',
        errorCode: 'NOT_FOUND'
      };
      setValidationResult(errorResult);
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    validateCoupon,
    clearValidation,
    isValidating,
    validationResult,
    isValid: validationResult?.valid || false,
    discountAmount: validationResult?.discountAmount || 0,
    discountType: validationResult?.discountType || '$',
    errorMessage: validationResult?.error
  };
};