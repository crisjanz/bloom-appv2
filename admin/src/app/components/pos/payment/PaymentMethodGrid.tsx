// components/pos/payment/PaymentMethodGrid.tsx - Using centralized payment methods config
import { FC, useEffect, useState, useMemo } from "react";
import { getPaymentMethods, getPaymentMethodsWithOptions, PaymentMethodConfig } from "@shared/utils/paymentMethods";
import GiftCardInput from "../../orders/payment/GiftCardInput";
import CouponInput from "../../orders/payment/CouponInput";
import DiscountModal from "./DiscountModal";
import usePaymentSettingsConfig from "@domains/payments/hooks/usePaymentSettingsConfig";

type Props = {
  selectedMethod: string;
  onSelect: (method: PaymentMethodConfig) => void;
  total: number;
  // Existing coupon/gift card state
  couponCode: string;
  setCouponCode: (val: string) => void;
  onCouponValidation: (code: string) => void;
  isValidatingCoupon: boolean;
  couponError: string;
  couponSuccess: string;
  isCouponValid: boolean;
  onGiftCardChange: (amount: number, redemptionData?: any) => void;
  // Manual discount
  onManualDiscount: (discount: {type: string, amount: number, description: string}) => void;
  appliedDiscounts?: Array<{type: string, amount: number, description: string}>;
  onCouponAdd: () => Promise<boolean>;
};

const PaymentMethodGrid: FC<Props> = ({ 
  selectedMethod, 
  onSelect,
  total,
  couponCode,
  setCouponCode,
  onCouponValidation,
  isValidatingCoupon,
  couponError,
  couponSuccess,
  isCouponValid,
  onGiftCardChange,
  onManualDiscount,
  appliedDiscounts = [],
  onCouponAdd
}) => {
  // Get POS payment methods from centralized config
  const { settings: paymentSettings, offlineMethods, refresh } = usePaymentSettingsConfig();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    refresh();
  }, [refresh]);

  const posPaymentMethods = useMemo(() => {
    if (paymentSettings) {
      return getPaymentMethodsWithOptions('pos', {
        builtIn: paymentSettings.builtInMethods,
        offlineMethods,
      });
    }
    return getPaymentMethods('pos');
  }, [paymentSettings, offlineMethods]);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);

  return (
    <div className="space-y-6">
      
      {/* Payment Methods */}
      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-4">Payment Method</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posPaymentMethods.map((method) => {
              const isSelected = selectedMethod === method.id;

              return (
                <button
                  key={method.id}
                  onClick={() => onSelect(method)}
                  className={`relative w-full h-24 flex flex-col justify-center items-center rounded-xl border-2 shadow-md transition-all hover:shadow-xl
                    ${
                      isSelected
                        ? "bg-[#597485] border-[#597485] text-white"
                        : "bg-white dark:bg-boxdark border-gray-300 dark:border-strokedark hover:border-[#597485]/50 text-gray-800 dark:text-white"
                    }
                  `}
                >
                  <div className="mb-1">{method.icon}</div>
                  <span className="text-sm font-medium text-center px-2">{method.label}</span>

                  {isSelected && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white border-2 border-white flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#597485]" />
                    </div>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Discounts & Credits - REMOVED THE DISPLAY SECTION */}
      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-4">Discounts & Credits</h3>
        
        {/* Only keep the action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <button
            onClick={() => setShowDiscountModal(true)}
            className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-[#597485] hover:text-[#597485] transition-all"
          >
            <span className="text-lg">💰</span>
            <span className="font-medium">Add Discount</span>
          </button>

          <button
            onClick={() => setShowGiftCardModal(true)}
            className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-[#597485] hover:text-[#597485] transition-all"
          >
            <span className="text-lg">🎁</span>
            <span className="font-medium">Gift Card</span>
          </button>

          <button
            onClick={() => setShowCouponModal(true)}
            className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-[#597485] hover:text-[#597485] transition-all"
          >
            <span className="text-lg">🎫</span>
            <span className="font-medium">Coupon</span>
          </button>
        </div>
      </div>

      {/* Gift Card Modal - Updated to not auto-close */}
      {showGiftCardModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black dark:text-white">Gift Card</h2>
              <button
                onClick={() => setShowGiftCardModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <GiftCardInput
              onGiftCardChange={(amount, data) => {
                onGiftCardChange(amount, data);
                // Don't auto-close modal
              }}
              grandTotal={total}
            />
            
            {/* Add a Done button */}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowGiftCardModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coupon Modal - Updated with apply button */}
   {showCouponModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
    <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black dark:text-white">Coupon Code</h2>
        <button
          onClick={() => setShowCouponModal(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <CouponInput
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        onCouponValidation={onCouponValidation}
        isValidating={isValidatingCoupon}
        couponError={couponError}
        couponSuccess={couponSuccess}
        isValid={isCouponValid}
      />
      
      {/* Action Buttons - Simplified */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setShowCouponModal(false)}
          className="flex-1 py-3 px-4 border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 rounded-xl font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            // Call the new onCouponAdd function and wait for result
            const success = await onCouponAdd();
            if (success) {
              setShowCouponModal(false); // Only close modal on success
            }
            // If success is false, modal stays open so user can correct the code
          }}
          disabled={!couponCode}
          className="flex-1 py-3 px-4 bg-[#597485] hover:bg-[#4e6575] disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
        >
          Add Coupon
        </button>
      </div>
    </div>
  </div>
)}

      {/* Manual Discount Modal */}
      <DiscountModal
        open={showDiscountModal}
        onApply={(discount) => {
          onManualDiscount(discount);
          setShowDiscountModal(false);
        }}
        onCancel={() => setShowDiscountModal(false)}
      />
    </div>
  );
};

export default PaymentMethodGrid;
