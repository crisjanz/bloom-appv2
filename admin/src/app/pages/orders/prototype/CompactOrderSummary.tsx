// CompactOrderSummary.tsx - Compact multi-order summary panel
import { OrderPrototypeState } from "../TakeOrderPrototypePage";

interface Props {
  orders: OrderPrototypeState[];
  activeOrderIndex: number;
  onEdit: (section: string, orderIndex: number) => void;
  onAddOrder: () => void;
  onRemoveOrder: (index: number) => void;
  onSwitchOrder: (index: number) => void;
}

export default function CompactOrderSummary({
  orders,
  activeOrderIndex,
  onEdit,
  onAddOrder,
  onRemoveOrder,
  onSwitchOrder,
}: Props) {
  // Calculate grand totals across all orders
  const grandTotal = orders.reduce((sum, order) => sum + order.payment.total, 0);
  const hasMultipleOrders = orders.length > 1;

  // Get shared customer info (from first order)
  const customer = orders[0]?.customer;

  return (
    <div className="sticky top-6">
      <div className="bg-white dark:bg-boxdark rounded-lg border border-stroke dark:border-strokedark overflow-hidden">
        {/* Header */}
        <div className="bg-[#597485] text-white px-4 py-3">
          <h2 className="text-base font-semibold">Order Summary</h2>
          {hasMultipleOrders && (
            <p className="text-xs opacity-90">{orders.length} orders</p>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Customer Info - Shared across all orders */}
          {customer && (customer.firstName || customer.phone) && (
            <>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Customer Info
                </p>
                <p className="text-sm font-medium text-black dark:text-white">
                  {customer.firstName} {customer.lastName}
                </p>
                {customer.phone && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {customer.phone}
                  </p>
                )}
              </div>
              <div className="border-t border-stroke dark:border-strokedark" />
            </>
          )}

          {/* Orders */}
          {orders.map((order, orderIndex) => {
            const isActive = orderIndex === activeOrderIndex;

            return (
              <div
                key={orderIndex}
                className={`${isActive ? "bg-blue-50 dark:bg-blue-900/10 -mx-2 px-2 py-2 rounded-lg" : ""}`}
              >
                {/* Recipient Header */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-black dark:text-white">
                    {hasMultipleOrders ? `Recipient - Order ${orderIndex + 1}` : "Recipient"}
                  </p>
                  {hasMultipleOrders && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => onSwitchOrder(orderIndex)}
                        className="text-xs text-[#597485] hover:underline dark:text-[#7a9bb0]"
                        title="Switch to this order"
                      >
                        {isActive ? "Active" : "Edit"}
                      </button>
                      {orders.length > 1 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <button
                            onClick={() => onRemoveOrder(orderIndex)}
                            className="text-xs text-red-600 hover:underline dark:text-red-400"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Recipient Details - Clickable */}
                {order.recipient.useCustomer ? (
                  <button
                    onClick={() => onEdit("recipient", orderIndex)}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-[#597485] dark:hover:text-[#7a9bb0] text-left"
                  >
                    Using customer's information
                  </button>
                ) : (
                  <div className="space-y-1">
                    {order.recipient.firstName && (
                      <button
                        onClick={() => onEdit("recipient", orderIndex)}
                        className="block text-sm text-gray-800 dark:text-gray-200 hover:text-[#597485] dark:hover:text-[#7a9bb0] text-left"
                      >
                        {order.recipient.firstName} {order.recipient.lastName}
                      </button>
                    )}
                    {order.orderMethod === "DELIVERY" && order.recipient.address.address1 && (
                      <button
                        onClick={() => onEdit("recipient", orderIndex)}
                        className="block text-xs text-gray-600 dark:text-gray-400 hover:text-[#597485] dark:hover:text-[#7a9bb0] text-left"
                      >
                        {order.recipient.address.address1}, {order.recipient.address.city}
                      </button>
                    )}
                    {order.recipient.phone && (
                      <button
                        onClick={() => onEdit("recipient", orderIndex)}
                        className="block text-xs text-gray-600 dark:text-gray-400 hover:text-[#597485] dark:hover:text-[#7a9bb0] text-left"
                      >
                        {order.recipient.phone}
                      </button>
                    )}
                  </div>
                )}

                {/* Delivery Date - Clickable */}
                {order.delivery.date && (
                  <button
                    onClick={() => onEdit("delivery", orderIndex)}
                    className="block text-xs text-gray-600 dark:text-gray-400 hover:text-[#597485] dark:hover:text-[#7a9bb0] mt-1 text-left"
                  >
                    {order.delivery.date}
                    {order.delivery.time && ` • ${order.delivery.time}`}
                  </button>
                )}

                {/* Products - Clickable */}
                {order.products.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {order.products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => onEdit("products", orderIndex)}
                        className="flex justify-between text-xs w-full hover:text-[#597485] dark:hover:text-[#7a9bb0] text-left"
                      >
                        <span className="text-gray-700 dark:text-gray-300">
                          {product.qty > 1 && `${product.qty}x `}
                          {product.description}
                        </span>
                        <span className="text-gray-800 dark:text-gray-200 font-medium ml-2">
                          ${(product.price * product.qty).toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Delivery Fee */}
                {order.orderMethod === "DELIVERY" && order.delivery.fee > 0 && (
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-600 dark:text-gray-400">Delivery</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      ${order.delivery.fee.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Order separator for multi-order */}
                {hasMultipleOrders && orderIndex < orders.length - 1 && (
                  <div className="border-t border-stroke dark:border-strokedark mt-3" />
                )}
              </div>
            );
          })}

          {/* Payment Breakdown */}
          <div className="border-t border-stroke dark:border-strokedark pt-3">
            {hasMultipleOrders ? (
              // Grand total for multiple orders
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-black dark:text-white">Grand Total:</span>
                  <span className="text-[#597485]">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              // Detailed breakdown for single order
              orders[0] && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      ${orders[0].payment.subtotal.toFixed(2)}
                    </span>
                  </div>
                  {orders[0].orderMethod === "DELIVERY" && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Delivery:</span>
                      <span className="text-gray-800 dark:text-gray-200">
                        ${orders[0].payment.deliveryFee.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {orders[0].payment.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-${orders[0].payment.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">GST (5%):</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      ${orders[0].payment.gst.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">PST (7%):</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      ${orders[0].payment.pst.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-stroke dark:border-strokedark pt-2 text-base font-bold">
                    <span className="text-black dark:text-white">TOTAL:</span>
                    <span className="text-[#597485]">${orders[0].payment.total.toFixed(2)}</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-stroke dark:border-strokedark p-4 space-y-2">
          {orders.length < 5 && (
            <button
              onClick={onAddOrder}
              className="w-full border-2 border-dashed border-[#597485] text-[#597485] py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-meta-4 transition-all"
            >
              + Add Another Order
            </button>
          )}
          <button
            disabled={orders.length === 0 || !orders[0].customer.firstName}
            className="w-full bg-[#597485] text-white py-2.5 rounded-lg font-semibold hover:bg-[#4e6575] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
          >
            Process Payment - ${grandTotal.toFixed(2)}
          </button>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Prototype mode - no payment will be processed
          </p>
        </div>
      </div>
    </div>
  );
}
