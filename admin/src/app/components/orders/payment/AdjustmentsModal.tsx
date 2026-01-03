import { useEffect, useState } from "react";
import InputField from "@shared/ui/forms/input/InputField";
import GiftCardInput, { AppliedGiftCard } from "./GiftCardInput";
import CouponInput from "./CouponInput";

type AdjustmentTab = "discount" | "giftcard" | "coupon";

type DiscountType = "percent" | "amount";

type Props = {
  open: boolean;
  onClose: () => void;
  discountType: DiscountType;
  discountValue: string;
  onDiscountTypeChange: (value: DiscountType) => void;
  onDiscountValueChange: (value: string) => void;
  discountReason?: string;
  onDiscountReasonChange?: (value: string) => void;
  discountError?: string | null;
  onApplyDiscount: () => void;
  couponCode: string;
  setCouponCode: (value: string) => void;
  onCouponValidation: (code: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  isValidating: boolean;
  couponError: string;
  couponSuccess: string;
  isCouponValid: boolean;
  grandTotal: number;
  onGiftCardChange?: (amount: number, redemptionData?: any) => void;
  appliedGiftCards?: AppliedGiftCard[];
  onAppliedGiftCardsChange?: (cards: AppliedGiftCard[]) => void;
};

const AdjustmentsModal = ({
  open,
  onClose,
  discountType,
  discountValue,
  onDiscountTypeChange,
  onDiscountValueChange,
  discountReason,
  onDiscountReasonChange,
  discountError,
  onApplyDiscount,
  couponCode,
  setCouponCode,
  onCouponValidation,
  onApplyCoupon,
  onRemoveCoupon,
  isValidating,
  couponError,
  couponSuccess,
  isCouponValid,
  grandTotal,
  onGiftCardChange,
  appliedGiftCards,
  onAppliedGiftCardsChange
}: Props) => {
  const [activeTab, setActiveTab] = useState<AdjustmentTab>("discount");

  useEffect(() => {
    if (!open) return;
    setActiveTab("discount");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-boxdark">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-black dark:text-white">Discounts & Credits</h3>
          <button
            onClick={onClose}
            className="text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("discount")}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition ${
              activeTab === "discount"
                ? "border-b-2 border-brand-500 text-brand-500"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Discount
          </button>
          <button
            onClick={() => setActiveTab("giftcard")}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition ${
              activeTab === "giftcard"
                ? "border-b-2 border-brand-500 text-brand-500"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Gift Card
          </button>
          <button
            onClick={() => setActiveTab("coupon")}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition ${
              activeTab === "coupon"
                ? "border-b-2 border-brand-500 text-brand-500"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Coupon
          </button>
        </div>

        <div className="px-6 py-6">
          {activeTab === "discount" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => onDiscountTypeChange("percent")}
                  className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    discountType === "percent"
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  Percentage
                </button>
                <button
                  onClick={() => onDiscountTypeChange("amount")}
                  className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    discountType === "amount"
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  Dollar Amount
                </button>
              </div>
              <InputField
                label={discountType === "percent" ? "Percent" : "Amount"}
                type="number"
                min="0"
                step={discountType === "percent" ? 1 : 0.01}
                value={discountValue}
                onChange={(event) => onDiscountValueChange(event.target.value)}
              />
              {onDiscountReasonChange && (
                <InputField
                  label="Reason (Optional)"
                  value={discountReason || ""}
                  onChange={(event) => onDiscountReasonChange(event.target.value)}
                />
              )}
              {discountError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  {discountError}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={onApplyDiscount}
                  className="rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  Apply Discount
                </button>
              </div>
            </div>
          )}

          {activeTab === "giftcard" && (
            <div className="space-y-4">
              <GiftCardInput
                grandTotal={grandTotal}
                onGiftCardChange={onGiftCardChange}
                appliedGiftCards={appliedGiftCards}
                onAppliedGiftCardsChange={onAppliedGiftCardsChange}
              />
            </div>
          )}

          {activeTab === "coupon" && (
            <div className="space-y-4">
              <CouponInput
                couponCode={couponCode}
                setCouponCode={setCouponCode}
                onCouponValidation={onCouponValidation}
                isValidating={isValidating}
                couponError={couponError}
                couponSuccess={couponSuccess}
                isValid={isCouponValid}
              />
              <div className="flex gap-3">
                <button
                  onClick={onApplyCoupon}
                  className="flex-1 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  Apply Coupon
                </button>
                <button
                  onClick={onRemoveCoupon}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdjustmentsModal;
