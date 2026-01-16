/**
 * Payment Discounts Management Hook
 *
 * Manages all discount-related state and logic:
 * - Manual discounts (percentage or fixed amount)
 * - Gift card redemptions
 * - Coupon code validation and application
 */

import { useState, useCallback } from 'react';
import { formatCurrency, parseUserCurrency } from '@shared/utils/currency';

export type ManualDiscountType = 'percent' | 'amount';

export type GiftCardRedemption = {
  cardNumber: string;
  amount: number;
};

export type AppliedDiscount = {
  type: string;
  amount: number;
  description: string;
};

export const usePaymentDiscounts = (
  appliedDiscounts: AppliedDiscount[] = [],
  onDiscountsChange?: (discounts: AppliedDiscount[]) => void,
  onGiftCardChange?: (amount: number) => void,
  onCouponChange?: (amount: number, name?: string) => void,
) => {
  const [manualDiscountType, setManualDiscountType] = useState<ManualDiscountType>('percent');
  const [manualDiscountValue, setManualDiscountValue] = useState('');
  const [manualDiscountReason, setManualDiscountReason] = useState('');
  const [manualDiscountError, setManualDiscountError] = useState<string | null>(null);

  const [giftCardRedemptions, setGiftCardRedemptions] = useState<GiftCardRedemption[]>([]);

  const [couponCode, setCouponCode] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponError, setCouponError] = useState('');

  const applyManualDiscount = useCallback((total: number) => {
    const rawValue = parseFloat(manualDiscountValue);
    const amountValue = parseUserCurrency(manualDiscountValue);
    if (manualDiscountType === 'percent') {
      if (!rawValue || rawValue <= 0) {
        setManualDiscountError('Enter a discount value greater than zero.');
        return false;
      }
    } else if (amountValue <= 0) {
      setManualDiscountError('Enter a discount value greater than zero.');
      return false;
    }

    const discountAmount =
      manualDiscountType === 'percent'
        ? Math.round((total * rawValue) / 100)
        : amountValue;

    if (discountAmount <= 0) {
      setManualDiscountError('Discount would not change the balance.');
      return false;
    }

    const description =
      manualDiscountType === 'percent'
        ? `${rawValue}% Discount${manualDiscountReason ? ` – ${manualDiscountReason}` : ''}`
        : `${formatCurrency(discountAmount)} Discount${manualDiscountReason ? ` – ${manualDiscountReason}` : ''}`;

    const nextDiscounts = [...appliedDiscounts, { type: manualDiscountType, amount: discountAmount, description }];
    onDiscountsChange?.(nextDiscounts);

    setManualDiscountError(null);
    setManualDiscountValue('');
    setManualDiscountReason('');

    return true;
  }, [appliedDiscounts, manualDiscountReason, manualDiscountType, manualDiscountValue, onDiscountsChange]);

  const handleGiftCardChange = useCallback((
    amount: number,
    redemptionData: GiftCardRedemption[] = [],
  ) => {
    onGiftCardChange?.(amount);
    setGiftCardRedemptions(redemptionData);
  }, [onGiftCardChange]);

  const applyCoupon = useCallback((couponName?: string, discountAmount?: number) => {
    if (!discountAmount) {
      setCouponError('Invalid coupon discount amount.');
      return false;
    }

    onCouponChange?.(discountAmount, couponName);
    setCouponSuccess(`Applied ${couponName || couponCode}`);
    setCouponError('');
    return true;
  }, [couponCode, onCouponChange]);

  const removeCoupon = useCallback(() => {
    setCouponCode('');
    setCouponSuccess('');
    setCouponError('');
    onCouponChange?.(0);
  }, [onCouponChange]);

  const resetDiscounts = useCallback(() => {
    setManualDiscountType('percent');
    setManualDiscountValue('');
    setManualDiscountReason('');
    setManualDiscountError(null);
    setGiftCardRedemptions([]);
    setCouponCode('');
    setCouponSuccess('');
    setCouponError('');
  }, []);

  return {
    // Manual Discount State
    manualDiscountType,
    manualDiscountValue,
    manualDiscountReason,
    manualDiscountError,
    setManualDiscountType,
    setManualDiscountValue,
    setManualDiscountReason,
    setManualDiscountError,

    // Gift Card State
    giftCardRedemptions,
    setGiftCardRedemptions,
    handleGiftCardChange,

    // Coupon State
    couponCode,
    couponSuccess,
    couponError,
    setCouponCode,
    setCouponSuccess,
    setCouponError,

    // Actions
    applyManualDiscount,
    applyCoupon,
    removeCoupon,
    resetDiscounts,
  };
};
