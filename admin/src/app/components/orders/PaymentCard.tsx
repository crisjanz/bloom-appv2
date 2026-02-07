// src/components/orders/PaymentCard.tsx
import { useState, useEffect } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Checkbox from "@shared/ui/forms/input/Checkbox";
import AdjustmentsModal from "./payment/AdjustmentsModal";
import { useCouponValidation } from "@shared/hooks/useCouponValidation";
import type { CouponSource } from "@shared/types/coupon";
import type { AppliedGiftCard } from "./payment/GiftCardInput";
import { centsToDollars, formatCurrency, parseUserCurrency } from "@shared/utils/currency";

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
  giftCardDiscount = 0,
  automaticDiscounts = [],
  automaticDiscountAmount = 0,
}: Props) {
  const [showAdjustmentsModal, setShowAdjustmentsModal] = useState(false);
  const [appliedGiftCards, setAppliedGiftCards] = useState<AppliedGiftCard[]>([]);
  const [discountDraftType, setDiscountDraftType] = useState<"percent" | "amount">(
    discountType === "%" ? "percent" : "amount"
  );
  const [discountDraftValue, setDiscountDraftValue] = useState("");
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
  const manualDiscountAmount =
    discountType === "%"
      ? Math.round((itemTotal + deliveryCharge) * (discount / 100))
      : discount;

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
      setCouponSuccess(
        `Coupon applied: ${
          result.discountType === '%'
            ? `${result.coupon?.value}% off`
            : `${formatCurrency(result.discountAmount || 0)} off`
        }`
      );
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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Enter a coupon code first');
      return;
    }
    await handleCouponValidation(couponCode.trim());
  };

  const handleRemoveGiftCard = (cardNumber: string) => {
    const updatedCards = appliedGiftCards.filter((card) => card.cardNumber !== cardNumber);
    setAppliedGiftCards(updatedCards);
    const totalDiscount = updatedCards.reduce((sum, card) => sum + card.amountUsed, 0);
    onGiftCardChange?.(
      totalDiscount,
      updatedCards.map((card) => ({
        cardNumber: card.cardNumber,
        amount: card.amountUsed
      }))
    );
  };

  useEffect(() => {
    if (!couponCode) {
      clearValidation();
      setCouponError('');
      setCouponSuccess('');
      setAppliedCoupon(null);
    }
  }, [couponCode, clearValidation]);

  useEffect(() => {
    if (!showAdjustmentsModal) return;
    setDiscountDraftType(discountType === "%" ? "percent" : "amount");
    setDiscountDraftValue(
      discount
        ? discountType === "%"
          ? String(discount)
          : centsToDollars(discount).toFixed(2)
        : ""
    );
  }, [showAdjustmentsModal, discount, discountType]);

  useEffect(() => {
    if (!giftCardDiscount && appliedGiftCards.length > 0) {
      setAppliedGiftCards([]);
    }
  }, [giftCardDiscount, appliedGiftCards.length]);

  return (
    <ComponentCard title="Order Summary & Payment">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="font-medium text-black dark:text-white mb-4">Order Breakdown</h3>
          <div className="space-y-1">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400">Items Total:</span>
              <span className="font-medium text-black dark:text-white">{formatCurrency(itemTotal)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400">Delivery Charge:</span>
              <span className="font-medium text-black dark:text-white">{formatCurrency(deliveryCharge)}</span>
            </div>
            {manualDiscountAmount > 0 && (
              <div className="flex justify-between items-center py-1">
                <span className="text-green-700 dark:text-green-400">
                  Manual Discount{discountType === "%" ? ` (${discount}%)` : ""}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-green-700 dark:text-green-400">
                    -{formatCurrency(manualDiscountAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDiscount(0)}
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-red-500 text-[10px] font-semibold text-red-600 hover:border-red-600 hover:text-red-700"
                    aria-label="Remove manual discount"
                  >
                    X
                  </button>
                </div>
              </div>
            )}
            {isValid && appliedCoupon && (
              <div className="flex justify-between items-center py-1">
                <span className="text-green-700 dark:text-green-400">Coupon ({appliedCoupon.code})</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-green-700 dark:text-green-400">
                    -{formatCurrency(discountAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-red-500 text-[10px] font-semibold text-red-600 hover:border-red-600 hover:text-red-700"
                    aria-label="Remove coupon"
                  >
                    X
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
                      -{formatCurrency(discount.discountAmount || 0)}
                  </span>
                </div>
              </div>
            ))}
            {appliedGiftCards.map((card) => (
              <div key={card.cardNumber} className="flex justify-between items-center py-1">
                <span className="text-green-700 dark:text-green-400">Gift Card {card.cardNumber}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-green-700 dark:text-green-400">
                    -{formatCurrency(card.amountUsed)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveGiftCard(card.cardNumber)}
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-red-500 text-[10px] font-semibold text-red-600 hover:border-red-600 hover:text-red-700"
                    aria-label={`Remove gift card ${card.cardNumber}`}
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
            <div className="border-t border-stroke pt-3 dark:border-strokedark">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-600 dark:text-gray-400">GST (5%):</span>
                <span className="text-black dark:text-white">{formatCurrency(gst)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-600 dark:text-gray-400">PST (7%):</span>
                <span className="text-black dark:text-white">{formatCurrency(pst)}</span>
              </div>
            </div>
            <div className="border-t border-stroke pt-3 dark:border-strokedark">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-black dark:text-white">Grand Total:</span>
                <span className="text-xl font-bold text-black dark:text-white">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-600 dark:bg-gray-800">
            <div className="text-3xl font-bold text-black dark:text-white">
              {formatCurrency(amountAfterGiftCards)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Total Amount Due
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAdjustmentsModal(true)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:border-brand-500 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200"
          >
            Discounts & Credits
          </button>
          <div className="space-y-4">
            <div className="space-y-3">
              <Checkbox
                checked={subscribe}
                onChange={(checked) => setSubscribe(checked)}
                label="Subscribe to newsletter for special offers"
                className="checked:bg-brand-500 checked:border-brand-500"
              />
              <Checkbox
                checked={sendEmailReceipt}
                onChange={(checked) => setSendEmailReceipt(checked)}
                label="Send email receipt to customer"
                className="checked:bg-brand-500 checked:border-brand-500"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onTriggerPayment}
            className="w-full inline-flex items-center justify-center rounded-md bg-brand-500 px-6 py-4 text-center text-lg font-medium text-white transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {amountAfterGiftCards > 0 
              ? `Process Payment - ${formatCurrency(amountAfterGiftCards)}` 
              : "Complete Order"
            }
          </button>
        </div>
      </div>
      <AdjustmentsModal
        open={showAdjustmentsModal}
        onClose={() => setShowAdjustmentsModal(false)}
        discountType={discountDraftType}
        discountValue={discountDraftValue}
        onDiscountTypeChange={setDiscountDraftType}
        onDiscountValueChange={setDiscountDraftValue}
        onApplyDiscount={() => {
          const parsed = Number.parseFloat(discountDraftValue);
          const safeValue =
            discountDraftType === "percent"
              ? Number.isNaN(parsed)
                ? 0
                : Math.max(0, parsed)
              : parseUserCurrency(discountDraftValue);
          setDiscountType(discountDraftType === "percent" ? "%" : "$");
          setDiscount(safeValue);
        }}
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        onCouponValidation={handleCouponValidation}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        isValidating={isValidating}
        couponError={couponError}
        couponSuccess={couponSuccess}
        isCouponValid={isValid}
        grandTotal={grandTotal + giftCardDiscount}
        onGiftCardChange={onGiftCardChange}
        appliedGiftCards={appliedGiftCards}
        onAppliedGiftCardsChange={setAppliedGiftCards}
      />
    </ComponentCard>
  );
}
