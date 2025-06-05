// src/components/orders/PaymentCard.tsx
import React from "react";
import ComponentCard from "../common/ComponentCard";
import InputField from "../form/input/InputField";
import Select from "../form/Select";
import Label from "../form/Label";
import Checkbox from "../form/input/Checkbox";

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
}: Props) {
  const handleCouponBlur = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === "SAVE10") {
      setDiscount(10);
      setDiscountType("%");
    } else if (code === "WELCOME20") {
      setDiscount(20);
      setDiscountType("$");
    } else if (code !== "") {
      // Invalid coupon
      setDiscount(0);
      alert("Invalid coupon code");
    }
  };

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

            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-3">
                <Label>Discount:</Label>
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
              <span className="text-red-600 font-medium">
                -{discountType === "%" ? `${discount}%` : `$${discount.toFixed(2)}`}
              </span>
            </div>

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

          {/* Coupon Code */}
          <div>
            <Label htmlFor="couponCode">Coupon / Gift Card Code</Label>
            <InputField
              type="text"
              id="couponCode"
              placeholder="Enter coupon code (e.g., SAVE10)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              onBlur={handleCouponBlur}
            />
            {couponCode && discount > 0 && (
              <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                ✓ Coupon applied: {discountType === "%" ? `${discount}% off` : `$${discount} off`}
              </div>
            )}
          </div>

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
            <svg
              className="mr-3 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {grandTotal > 0 ? `Process Payment - $${grandTotal.toFixed(2)}` : "No Payment Required"}
          </button>

          {/* Quick Payment Options */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setCouponCode("SAVE10");
                handleCouponBlur();
              }}
              className="inline-flex items-center justify-center rounded border border-stroke py-2 px-3 text-center text-sm font-medium text-black hover:bg-gray-2 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
            >
              Apply SAVE10
            </button>
            
            <button
              type="button"
              onClick={() => {
                setDiscount(0);
                setCouponCode("");
              }}
              className="inline-flex items-center justify-center rounded border border-stroke py-2 px-3 text-center text-sm font-medium text-red-600 hover:bg-red-50 dark:border-strokedark dark:hover:bg-red-900/20"
            >
              Clear Discount
            </button>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}