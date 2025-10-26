// src/components/orders/PaymentCard.tsx
import { useState, useEffect } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import Select from "@shared/ui/forms/Select";
import Label from "@shared/ui/forms/Label";
import Checkbox from "@shared/ui/forms/input/Checkbox";
import CouponInput from "./payment/CouponInput";
import GiftCardModal from "./payment/GiftCardModal";
import { useCouponValidation } from "@shared/hooks/useCouponValidation";
import type { CouponSource } from "@shared/types/coupon";

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
  sendSMSReceipt?: boolean;
  setSendSMSReceipt?: (val: boolean) => void;
  onTriggerPayment: () => void;
  customerId?: string;
  productIds?: string[];
  categoryIds?: string[];
  source?: CouponSource;
  onCouponDiscountChange?: (amount: number) => void;
  onGiftCardChange?: (amount: number, redemptionData?: any) => void;
  hasGiftCards?: boolean;
  giftCardDiscount?: number;
  automaticDiscounts?: any[];
  automaticDiscountAmount?: number;
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
  sendSMSReceipt,
  setSendSMSReceipt,
  onTriggerPayment,
  customerId,
  productIds = [],
  categoryIds = [],
  source = 'WEBSITE',
  onCouponDiscountChange,
  onGiftCardChange,
  hasGiftCards = false,
  giftCardDiscount = 0,
  automaticDiscounts = [],
  automaticDiscountAmount = 0,
}: Props) {
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [appliedGiftCards, setAppliedGiftCards] = useState<any[]>([]);
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
  const amountAfterGiftCards = Math.max(0, grandTotal - giftCardDiscount);

  const handleCouponValidation = async (code: string) => {
    if (!code.trim()) {
      clearValidation();
      setCouponError('');
      setCouponSuccess('');
      setAppliedCoupon(null);
      onCouponDiscountChange?.(0);
      return;
    }
    const orderTotal = itemTotal + (deliveryCharge / 100);
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

  const handleAddGiftCard = (cardData: { cardNumber: string; amount: number; balance: number }) => {
    const updatedCards = [...appliedGiftCards, cardData];
    setAppliedGiftCards(updatedCards);
    const totalDiscount = updatedCards.reduce((sum, card) => sum + card.amount, 0);
    onGiftCardChange?.(totalDiscount, updatedCards.map(card => ({
      cardNumber: card.cardNumber,
      amount: card.amount
    })));
  };

  const handleRemoveGiftCard = (index: number) => {
    const updatedCards = appliedGiftCards.filter((_, i) => i !== index);
    setAppliedGiftCards(updatedCards);
    const totalDiscount = updatedCards.reduce((sum, card) => sum + card.amount, 0);
    if (updatedCards.length === 0) {
      onGiftCardChange?.(0, []);
    } else {
      onGiftCardChange?.(totalDiscount, updatedCards.map(card => ({
        cardNumber: card.cardNumber,
        amount: card.amount
      })));
    }
  };

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
        <div className="space-y-4">
          <h3 className="font-medium text-black dark:text-white mb-4">Order Breakdown</h3>
          <div className="space-y-1">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400">Items Total:</span>
              <span className="font-medium text-black dark:text-white">${itemTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400">Delivery Charge:</span>
              <span className="font-medium text-black dark:text-white">${(deliveryCharge / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <div className="flex items-center gap-4">
                <span className="text-gray-600 dark:text-gray-400">Manual Discount:</span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={discount.toString()}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="w-16 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-center text-sm focus:outline-none focus:border-[#597485] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                    min="0"
                  />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="discountType"
                        value="$"
                        checked={discountType === "$"}
                        onChange={(e) => setDiscountType(e.target.value as "$" | "%")}
                        className="sr-only"
                      />
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        discountType === "$" 
                          ? "border-[#597485] bg-[#597485]" 
                          : "border-stroke dark:border-strokedark"
                      }`}>
                        {discountType === "$" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                        )}
                      </span>
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">$</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="discountType"
                        value="%"
                        checked={discountType === "%"}
                        onChange={(e) => setDiscountType(e.target.value as "$" | "%")}
                        className="sr-only"
                      />
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        discountType === "%" 
                          ? "border-[#597485] bg-[#597485]" 
                          : "border-stroke dark:border-strokedark"
                      }`}>
                        {discountType === "%" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                        )}
                      </span>
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">%</span>
                    </label>
                  </div>
                </div>
              </div>
              <span className="font-medium text-black dark:text-white">
                -${discountType === "%"
                  ? ((itemTotal + (deliveryCharge / 100)) * discount / 100).toFixed(2)
                  : (discount / 100).toFixed(2)
                }
              </span>
            </div>
            {isValid && couponSuccess && appliedCoupon && (
              <div className="flex justify-between items-center py-1 bg-green-50 dark:bg-green-900/20 px-3 rounded-md border border-green-200 dark:border-green-800">
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
            {automaticDiscounts.map((discount, index) => (
              <div key={index} className="flex justify-between items-center py-1 bg-blue-50 dark:bg-blue-900/20 px-3 rounded-md border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Auto: {discount.name}
                      </span>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        {discount.description || 'Automatic discount applied'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-800 dark:text-blue-200">
                      -${discount.discountAmount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
            ))}
            {appliedGiftCards.map((card, index) => (
              <div key={index} className="flex justify-between items-center py-1 bg-blue-50 dark:bg-blue-900/20 px-3 rounded-md border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 5H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM2 8h16V6H2v2zm2 3a1 1 0 011-1h1a1 1 0 010 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Gift Card: {card.cardNumber}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-800 dark:text-blue-200">
                      -${card.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleRemoveGiftCard(index)}
                      className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                      title="Remove gift card"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
            ))}
            <button
              type="button"
              onClick={() => setShowGiftCardModal(true)}
              className="mt-2 text-sm text-[#597485] hover:text-[#597485]/80 font-medium"
            >
              + Add Gift Card
            </button>
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
            <div className="border-t border-stroke pt-3 dark:border-strokedark">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-black dark:text-white">Grand Total:</span>
                <span className="text-xl font-bold text-black dark:text-white">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-600 dark:bg-gray-800">
            <div className="text-3xl font-bold text-black dark:text-white">
              ${amountAfterGiftCards.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Total Amount Due
            </div>
          </div>
          <CouponInput
            couponCode={couponCode}
            setCouponCode={setCouponCode}
            onCouponValidation={handleCouponValidation}
            isValidating={isValidating}
            couponError={couponError}
            couponSuccess={couponSuccess}
            isValid={isValid}
          />
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
          <button
            type="button"
            onClick={onTriggerPayment}
            className="w-full inline-flex items-center justify-center rounded-md py-4 px-6 text-center text-lg font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
            style={{ backgroundColor: '#597485' }}
          >
            <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {hasGiftCards 
              ? "Activate Gift Cards & Complete Order"
              : amountAfterGiftCards > 0 
                ? `Process Payment - $${amountAfterGiftCards.toFixed(2)}` 
                : "Complete Order"
            }
          </button>
        </div>
      </div>
      <GiftCardModal
        open={showGiftCardModal}
        onClose={() => setShowGiftCardModal(false)}
        onAddGiftCard={handleAddGiftCard}
        grandTotal={grandTotal}
        appliedGiftCards={appliedGiftCards}
      />
    </ComponentCard>
  );
}