// PaymentSection.tsx - Step 5: Review & Payment
import { OrderPrototypeState } from "../TakeOrderPrototypePage";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";

interface Props {
  orderState: OrderPrototypeState;
  updateOrderState: (section: keyof OrderPrototypeState, data: any) => void;
  onPrevious: () => void;
}

export default function PaymentSection({ orderState, updateOrderState, onPrevious }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-black dark:text-white mb-2">Review & Payment</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review order details and process payment
        </p>
      </div>

      {/* Order Summary */}
      <div className="border border-stroke dark:border-strokedark rounded-lg p-6">
        <h3 className="font-semibold text-lg text-black dark:text-white mb-4">Order Summary</h3>

        <div className="space-y-4">
          {/* Customer Info */}
          <div className="flex justify-between border-b border-stroke dark:border-strokedark pb-3">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {orderState.customer.firstName} {orderState.customer.lastName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{orderState.customer.phone}</p>
            </div>
            <span className="text-xs text-[#597485] dark:text-[#7a9bb0]">
              {orderState.orderType} • {orderState.orderMethod}
            </span>
          </div>

          {/* Recipient Info */}
          <div className="flex justify-between border-b border-stroke dark:border-strokedark pb-3">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {orderState.orderMethod === "PICKUP" ? "Pickup Person" : "Recipient"}
              </p>
              {orderState.recipient.useCustomer ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">Same as customer</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {orderState.recipient.firstName} {orderState.recipient.lastName}
                  </p>
                  {orderState.orderMethod === "DELIVERY" && orderState.recipient.address.address1 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {orderState.recipient.address.address1}, {orderState.recipient.address.city}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Delivery Info */}
          {orderState.orderMethod === "DELIVERY" && orderState.delivery.date && (
            <div className="border-b border-stroke dark:border-strokedark pb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Delivery</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {orderState.delivery.date}
                {orderState.delivery.time && ` • ${orderState.delivery.time}`}
              </p>
            </div>
          )}

          {/* Products */}
          <div className="border-b border-stroke dark:border-strokedark pb-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Products ({orderState.products.length})
            </p>
            <div className="space-y-1">
              {orderState.products.map((product) => (
                <div key={product.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {product.qty}x {product.description}
                  </span>
                  <span className="text-gray-800 dark:text-gray-200">
                    ${(product.price * product.qty).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Discounts & Coupons */}
      <div className="border border-stroke dark:border-strokedark rounded-lg p-6">
        <h3 className="font-semibold text-black dark:text-white mb-4">Discounts & Coupons</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="couponCode">Coupon Code</Label>
            <div className="flex gap-2">
              <InputField
                type="text"
                id="couponCode"
                placeholder="Enter code"
                value={orderState.payment.couponCode}
                onChange={(e) => updateOrderState("payment", { couponCode: e.target.value })}
              />
              <button className="px-4 py-2 border border-stroke rounded-lg hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4 whitespace-nowrap">
                Apply
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="discount">Manual Discount</Label>
            <InputField
              type="number"
              id="discount"
              placeholder="0.00"
              value={orderState.payment.discount}
              onChange={(e) => updateOrderState("payment", { discount: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="border border-stroke dark:border-strokedark rounded-lg p-6">
        <h3 className="font-semibold text-black dark:text-white mb-4">Payment Breakdown</h3>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
            <span className="text-gray-800 dark:text-gray-200">
              ${orderState.payment.subtotal.toFixed(2)}
            </span>
          </div>

          {orderState.orderMethod === "DELIVERY" && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Delivery Fee:</span>
              <span className="text-gray-800 dark:text-gray-200">
                ${orderState.payment.deliveryFee.toFixed(2)}
              </span>
            </div>
          )}

          {orderState.payment.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount:</span>
              <span>-${orderState.payment.discount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">GST (5%):</span>
            <span className="text-gray-800 dark:text-gray-200">
              ${orderState.payment.gst.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">PST (7%):</span>
            <span className="text-gray-800 dark:text-gray-200">
              ${orderState.payment.pst.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between border-t border-stroke dark:border-strokedark pt-3 text-xl font-bold">
            <span className="text-black dark:text-white">TOTAL:</span>
            <span className="text-[#597485]">${orderState.payment.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          ℹ️ Review the order details above. Use the <strong>"Process Payment"</strong> button in the summary panel to complete the order.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-start pt-6 border-t border-stroke dark:border-strokedark">
        <button
          onClick={onPrevious}
          className="px-6 py-3 border border-stroke rounded-lg hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4"
        >
          ← Previous
        </button>
      </div>
    </div>
  );
}
