// src/components/orders/payment/CouponInput.tsx
import React from "react";
import InputField from "../../form/input/InputField";
import Label from "../../form/Label";

type Props = {
  couponCode: string;
  setCouponCode: (val: string) => void;
  onCouponValidation: (code: string) => void;
  isValidating: boolean;
  couponError: string;
  couponSuccess: string;
  isValid: boolean;
};

const CouponInput: React.FC<Props> = ({
  couponCode,
  setCouponCode,
  onCouponValidation,
  isValidating,
  couponError,
  couponSuccess,
  isValid
}) => {

  const handleBlur = () => {
    onCouponValidation(couponCode);
  };

  return (
    <div>
      <Label htmlFor="couponCode">Coupon Code</Label>
      <div className="relative">
        <InputField
          type="text"
          id="couponCode"
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          onBlur={handleBlur}
          className={`${
            isValid ? 'border-green-500' : 
            couponError ? 'border-red-500' : 
            ''
          }`}
          disabled={isValidating}
        />
        {isValidating && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-[#597485] border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
      
      {/* Success Message */}
      {couponSuccess && (
        <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          ✓ {couponSuccess}
        </div>
      )}
      
      {/* Error Message */}
      {couponError && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {couponError}
        </div>
      )}
    </div>
  );
};

export default CouponInput;