import React from "react";

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
  return (
    <div className="bg-card rounded shadow p-4 space-y-4">
      <h2 className="text-lg font-bold">Order Info</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
        {/* LEFT: Totals */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Items Total</span>
            <span>${itemTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span>Delivery</span>
            <input
              type="number"
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
              className="w-24 text-right px-2 py-1 rounded"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <span>Discount</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded"
              />
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "$" | "%")}
                className="select-input w-15 py-1"
              >
                <option value="$">$</option>
                <option value="%">%</option>
              </select>
            </div>
            <span className="ml-auto text-red-600">
              -{discountType === "%" ? `${discount}%` : `$${discount}`}
            </span>
          </div>

          <div className="flex justify-between">
            <span>GST (5%)</span>
            <span>${gst.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>PST (7%)</span>
            <span>${pst.toFixed(2)}</span>
          </div>

          <hr />

          <div className="flex justify-between font-bold text-lg">
            <span>Grand Total</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* RIGHT: Payment + Options */}
        <div className="space-y-4">
          <div className="bg-gray-200 text-center p-6 rounded text-2xl font-bold">
            {grandTotal > 0 ? `$${grandTotal.toFixed(2)}` : "--"}
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Coupon / Gift Card Code"
              className="w-full px-3 py-2 rounded"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              onBlur={() => {
                const code = couponCode.trim().toUpperCase();
                if (code === "SAVE10") {
                  setDiscount(10);
                  setDiscountType("%");
                } else {
                  setDiscount(0);
                }
              }}
            />

<div className="space-y-2">
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={subscribe}
      onChange={(e) => setSubscribe(e.target.checked)}
    />
    Subscribe to newsletter
  </label>

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={sendEmailReceipt}
      onChange={(e) => setSendEmailReceipt(e.target.checked)}
    />
    Send email receipt
  </label>
</div>


          </div>

          <button
            type="button"
            className="btn-primary w-full py-3 text-lg"
            onClick={onTriggerPayment}
          >
            Take Payment
          </button>
        </div>
      </div>
    </div>
  );
}
