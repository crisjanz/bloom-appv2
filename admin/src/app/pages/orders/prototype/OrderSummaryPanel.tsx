// OrderSummaryPanel.tsx - Sticky right-side summary
import { OrderPrototypeState } from "../TakeOrderPrototypePage";

interface Props {
  orderState: OrderPrototypeState;
  onEdit: (section: string) => void;
  completedSteps: Set<number>;
}

export default function OrderSummaryPanel({ orderState, onEdit, completedSteps }: Props) {
  const hasCustomer = orderState.customer.firstName || orderState.customer.phone;
  const hasRecipient = orderState.recipient.firstName || orderState.recipient.useCustomer;
  const hasDelivery = orderState.delivery.date || orderState.orderMethod === "PICKUP";
  const hasProducts = orderState.products.length > 0;

  return (
    <div className="sticky top-6">
      <div className="bg-white dark:bg-boxdark rounded-lg border border-stroke dark:border-strokedark overflow-hidden">
        {/* Header */}
        <div className="bg-[#597485] text-white px-6 py-4">
          <h2 className="text-lg font-semibold">Order Summary</h2>
          <p className="text-sm opacity-90">Review as you build</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Customer Section */}
          <div className="border-b border-stroke dark:border-strokedark pb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-black dark:text-white">Customer</h3>
              {hasCustomer && (
                <button
                  onClick={() => onEdit("customer")}
                  className="text-xs text-[#597485] hover:underline dark:text-[#7a9bb0]"
                >
                  Edit
                </button>
              )}
            </div>
            {hasCustomer ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {orderState.customer.firstName} {orderState.customer.lastName}
                </p>
                {orderState.customer.phone && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    📞 {orderState.customer.phone}
                  </p>
                )}
                {orderState.customer.email && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ✉️ {orderState.customer.email}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Order Type: <span className="font-medium">{orderState.orderType}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Method: <span className="font-medium">{orderState.orderMethod}</span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">No customer selected</p>
            )}
          </div>

          {/* Recipient Section */}
          <div className="border-b border-stroke dark:border-strokedark pb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-black dark:text-white">
                {orderState.orderMethod === "PICKUP" ? "Pickup Person" : "Recipient"}
              </h3>
              {hasRecipient && (
                <button
                  onClick={() => onEdit("recipient")}
                  className="text-xs text-[#597485] hover:underline dark:text-[#7a9bb0]"
                >
                  Edit
                </button>
              )}
            </div>
            {hasRecipient ? (
              <div className="space-y-1">
                {orderState.recipient.useCustomer ? (
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    ✓ Using customer's information
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {orderState.recipient.firstName} {orderState.recipient.lastName}
                    </p>
                    {orderState.recipient.phone && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        📞 {orderState.recipient.phone}
                      </p>
                    )}
                    {orderState.orderMethod === "DELIVERY" && orderState.recipient.address.address1 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        📍 {orderState.recipient.address.address1}
                        {orderState.recipient.address.address2 && `, ${orderState.recipient.address.address2}`}
                        <br />
                        {orderState.recipient.address.city}, {orderState.recipient.address.province}{" "}
                        {orderState.recipient.address.postalCode}
                      </p>
                    )}
                    {orderState.recipient.addressLabel && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Label: {orderState.recipient.addressLabel}
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                No {orderState.orderMethod === "PICKUP" ? "pickup person" : "recipient"} set
              </p>
            )}
          </div>

          {/* Delivery Section */}
          {orderState.orderMethod === "DELIVERY" && (
            <div className="border-b border-stroke dark:border-strokedark pb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-black dark:text-white">Delivery</h3>
                {hasDelivery && (
                  <button
                    onClick={() => onEdit("delivery")}
                    className="text-xs text-[#597485] hover:underline dark:text-[#7a9bb0]"
                  >
                    Edit
                  </button>
                )}
              </div>
              {hasDelivery ? (
                <div className="space-y-1">
                  {orderState.delivery.date && (
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      📅 {orderState.delivery.date}
                    </p>
                  )}
                  {orderState.delivery.time && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ⏰ {orderState.delivery.time}
                    </p>
                  )}
                  {orderState.delivery.fee > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Delivery Fee: ${orderState.delivery.fee.toFixed(2)}
                    </p>
                  )}
                  {orderState.delivery.instructions && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Instructions: {orderState.delivery.instructions}
                    </p>
                  )}
                  {orderState.delivery.cardMessage && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Card: "{orderState.delivery.cardMessage}"
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No delivery details</p>
              )}
            </div>
          )}

          {/* Products Section */}
          <div className="border-b border-stroke dark:border-strokedark pb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-black dark:text-white">
                Products ({orderState.products.length})
              </h3>
              {hasProducts && (
                <button
                  onClick={() => onEdit("products")}
                  className="text-xs text-[#597485] hover:underline dark:text-[#7a9bb0]"
                >
                  Edit
                </button>
              )}
            </div>
            {hasProducts ? (
              <div className="space-y-2">
                {orderState.products.map((product) => (
                  <div key={product.id} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <p className="text-gray-800 dark:text-gray-200">
                        {product.qty}x {product.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{product.category}</p>
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">
                      ${(product.price * product.qty).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">No products added</p>
            )}
          </div>

          {/* Payment Breakdown */}
          <div>
            <h3 className="font-semibold text-black dark:text-white mb-3">Payment</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="text-gray-800 dark:text-gray-200">
                  ${orderState.payment.subtotal.toFixed(2)}
                </span>
              </div>
              {orderState.orderMethod === "DELIVERY" && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Delivery:</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    ${orderState.payment.deliveryFee.toFixed(2)}
                  </span>
                </div>
              )}
              {orderState.payment.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-${orderState.payment.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">GST (5%):</span>
                <span className="text-gray-800 dark:text-gray-200">
                  ${orderState.payment.gst.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">PST (7%):</span>
                <span className="text-gray-800 dark:text-gray-200">
                  ${orderState.payment.pst.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-stroke dark:border-strokedark pt-2 text-lg font-bold">
                <span className="text-black dark:text-white">TOTAL:</span>
                <span className="text-[#597485]">${orderState.payment.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Process Payment Button */}
        <div className="border-t border-stroke dark:border-strokedark p-6">
          <button
            disabled={!completedSteps.has(4)}
            className="w-full bg-[#597485] text-white py-3 rounded-lg font-semibold hover:bg-[#4e6575] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {completedSteps.has(4) ? "Process Payment" : "Complete all steps"}
          </button>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
            Prototype mode - no payment will be processed
          </p>
        </div>
      </div>
    </div>
  );
}
