// src/components/orders/PaymentCard.tsx
import React, { useState, useEffect } from "react";
import ComponentCard from "../common/ComponentCard";
import InputField from "../form/input/InputField";
import Select from "../form/Select";
import Label from "../form/Label";
import Checkbox from "../form/input/Checkbox";
import CouponInput from "./payment/CouponInput";
import GiftCardInput from "./payment/GiftCardInput";
import { useCouponValidation } from "../../hooks/useCouponValidation";
import type { CouponSource } from "../../types/coupon";

type Props = {
  deliveryCharge: number;
  setDeliveryCharge: (val: number) => void;
  couponCode: string;
  setCouponCode: (val: string) => void;
  discount: number;
  setDiscount: (val: number) => void;
  discountType: "$" | "%";
  setDiscountType: (val: "$" | "%") => void;
  itemTotal: number;
  gst: number;
  pst: number;
  grandTotal: number;
  subscribe: boolean;
  setSubscribe: (val: boolean) => void;
  sendEmailReceipt: boolean;
  setSendEmailReceipt: (val: boolean) => void;
  onTriggerPayment: () => void;
  customerId?: string;
  productIds?: string[];
  categoryIds?: string[];
  source?: CouponSource;
  onCouponDiscountChange?: (amount: number) => void;
  onGiftCardChange?: (amount: number) => void;
  hasGiftCards?: boolean;
};

export default function PaymentCard({
  deliveryCharge,
  setDeliveryCharge,
  couponCode,
  setCouponCode,
  discount,
  setDiscount,
  discountType,
  setDiscountType,
  itemTotal,
  gst,
  pst,
  grandTotal,
  subscribe,
  setSubscribe,
  sendEmailReceipt,
  setSendEmailReceipt,
  onTriggerPayment,
  customerId,
  productIds = [],
  categoryIds = [],
  source = 'WEBSITE',
  onCouponDiscountChange,
  onGiftCardChange,
  hasGiftCards = false,
}: Props) {

  // ✅ MOVE COUPON STATE HERE (from CouponInput)
  const {
    validateCoupon,
    clearValidation,
    isValidating,
    isValid,
    discountAmount,
  } = useCouponValidation();

  const [couponError, setCouponError] = useState<string>('');
  const [couponSuccess, setCouponSuccess] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  // ✅ COUPON HANDLERS (moved from CouponInput)
  const handleCouponValidation = async (code: string) => {
    if (!code.trim()) {
      clearValidation();
      setCouponError('');
      setCouponSuccess('');
      setAppliedCoupon(null);
      onCouponDiscountChange?.(0);
      return;
    }

    const orderTotal = itemTotal + deliveryCharge;

    const result = await validateCoupon(code, orderTotal, {
      customerId,
      productIds,
      categoryIds,
      source
    });

    if (result?.valid) {
      setCouponError('');
      setCouponSuccess(`Coupon applied: ${result.discountType === '%' ? `${result.coupon?.value}% off` : `$${result.discountAmount?.toFixed(2)} off`}`);
      setAppliedCoupon(result.coupon);
      onCouponDiscountChange?.(result.discountAmount || 0);
    } else {
      setCouponError(result?.error || 'Invalid coupon code');
      setCouponSuccess('');
      setAppliedCoupon(null);
      onCouponDiscountChange?.(0);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    clearValidation();
    setCouponError('');
    setCouponSuccess('');
    setAppliedCoupon(null);
    onCouponDiscountChange?.(0);
  };

  // Clear validation when coupon code changes
  useEffect(() => {
    if (!couponCode) {
      clearValidation();
      setCouponError('');
      setCouponSuccess('');
      setAppliedCoupon(null);
    }
  }, [couponCode, clearValidation]);

  return (
    <ComponentCard title="Order Summary & Payment">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* LEFT: Order Totals */}
        <div className="space-y-4">
          <h3 className="font-medium text-black dark:text-white mb-4">Order Breakdown</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400">Items Total:</span>
              <span className="font-medium text-black dark:text-white">${itemTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <Label htmlFor="deliveryCharge">Delivery Charge:</Label>
              <div className="w-24">
                <InputField
                  type="number"
                  id="deliveryCharge"
                  value={deliveryCharge.toString()}
                  onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                  className="text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Manual Discount Row */}
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-3">
                <Label>Manual Discount:</Label>
                <div className="flex items-center gap-2">
                  <div className="w-20">
                    <InputField
                      type="number"
                      value={discount.toString()}
                      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                      className="text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min="0"
                    />
                  </div>
                  <div className="w-16">
                    <Select
                      options={[
                        { value: "$", label: "$" },
                        { value: "%", label: "%" },
                      ]}
                      value={discountType}
                      onChange={(value) => setDiscountType(value as "$" | "%")}
                    />
                  </div>
                </div>
              </div>
              <span className="text-black font-medium">
                -{discountType === "%" ? `${discount}%` : `$${discount.toFixed(2)}`}
              </span>
            </div>

            {/* ✅ APPLIED COUPON ROW - BACK ON LEFT SIDE */}
            {isValid && couponSuccess && appliedCoupon && (
              <div className="flex justify-between items-center py-2 bg-green-50 dark:bg-green-900/20 px-3 rounded-md border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Coupon: {appliedCoupon.code}
                    </span>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      {appliedCoupon.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-green-800 dark:text-green-200">
                    -${discountAmount.toFixed(2)}
                  </span>
                  <button
                    onClick={handleRemoveCoupon}
                    className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                    title="Remove coupon"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Tax Section */}
            <div className="border-t border-stroke pt-3 dark:border-strokedark">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-600 dark:text-gray-400">GST (5%):</span>
                <span className="text-black dark:text-white">${gst.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-600 dark:text-gray-400">PST (7%):</span>
                <span className="text-black dark:text-white">${pst.toFixed(2)}</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="border-t border-stroke pt-3 dark:border-strokedark">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-black dark:text-white">Grand Total:</span>
                <span className="text-xl font-bold text-black dark:text-white">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Payment Section */}
        <div className="space-y-6">
          {/* Total Display */}
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-600 dark:bg-gray-800">
            <div className="text-3xl font-bold text-black dark:text-white">
              {grandTotal > 0 ? `$${grandTotal.toFixed(2)}` : "$0.00"}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Total Amount Due
            </div>
          </div>

          {/* ✅ SIMPLIFIED COUPON INPUT - just input and messages */}
          <CouponInput
            couponCode={couponCode}
            setCouponCode={setCouponCode}
            onCouponValidation={handleCouponValidation}
            isValidating={isValidating}
            couponError={couponError}
            couponSuccess={couponSuccess}
            isValid={isValid}
          />

          {/* Gift Card Input Component */}
          <GiftCardInput
            onGiftCardChange={onGiftCardChange}
            grandTotal={grandTotal}
          />

          {/* Options */}
          <div className="space-y-4">
            <div className="space-y-3">
              <Checkbox
                checked={subscribe}
                onChange={(checked) => setSubscribe(checked)}
                label="Subscribe to newsletter for special offers"
                className="checked:bg-[#597485] checked:border-[#597485]"
              />

              <Checkbox
                checked={sendEmailReceipt}
                onChange={(checked) => setSendEmailReceipt(checked)}
                label="Send email receipt to customer"
                className="checked:bg-[#597485] checked:border-[#597485]"
              />
            </div>
          </div>

          {/* Payment Button */}
<button
  type="button"
  onClick={onTriggerPayment}
  disabled={grandTotal <= 0}
  className="w-full inline-flex items-center justify-center rounded-md py-4 px-6 text-center text-lg font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
  style={{ backgroundColor: '#597485' }}
>
  <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
  {/* ✅ UPDATED: Different text based on gift cards */}
  {hasGiftCards 
    ? "Activate Gift Cards & Process Payment"
    : grandTotal > 0 
      ? `Process Payment - $${grandTotal.toFixed(2)}` 
      : "No Payment Required"
  }
</button>
        </div>
      </div>
    </ComponentCard>
  );
}