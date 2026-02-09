import PropTypes from "prop-types";
import { formatSuccessCurrency } from "./utils";

const SuccessCard = ({ orderResult }) => {
  const { drafts, recipient, deliveryDate, cardMessage, isPickup, cartItems, totals, buyer } = orderResult;
  const orderNumber = drafts?.[0]?.orderNumber || drafts?.[0]?.id || "—";
  const recipientName = recipient ? `${recipient.firstName} ${recipient.lastName}`.trim() : "";

  const formattedDate = deliveryDate
    ? new Date(deliveryDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Success Icon */}
      <div className="mb-8 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-100">
          <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      {/* Main Message */}
      <div className="mb-10 text-center">
        <h1 className="mb-3 font-serif text-3xl text-gray-900">Thank you for your order!</h1>
        {recipientName && formattedDate && (
          <p className="text-lg text-gray-600">
            <span className="font-serif text-rose-600">{recipientName}</span>
            {isPickup ? " can pick up your order on " : " will receive your gift on "}
            <span className="font-medium text-gray-800">{formattedDate}</span>
          </p>
        )}
      </div>

      {/* Order Card */}
      <div className="mb-6 rounded-2xl bg-gray-50 p-6">
        {/* Order Header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="text-xl font-semibold text-gray-800">#{orderNumber}</p>
          </div>
          {formattedDate && (
            <div className="text-right">
              <p className="text-sm text-gray-500">{isPickup ? "Pickup Date" : "Delivery Date"}</p>
              <p className="text-xl font-semibold text-gray-800">{formattedDate}</p>
            </div>
          )}
        </div>

        {/* Products */}
        {cartItems && cartItems.length > 0 && (
          <div className="mb-6 space-y-4 border-b border-gray-200 pb-6">
            {cartItems.map((item, index) => (
              <div key={index} className="flex gap-4">
                {item.image ? (
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-white shadow-sm">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-rose-50">
                    <svg className="h-8 w-8 text-rose-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{item.name}</h3>
                  {item.quantity > 1 && <p className="text-sm text-gray-500">Qty: {item.quantity}</p>}
                </div>
                <p className="font-semibold text-gray-800">{formatSuccessCurrency(item.price)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recipient */}
        {recipient && !isPickup && (
          <div className="mb-6 border-b border-gray-200 pb-6">
            <p className="mb-2 text-sm text-gray-500">Delivering to</p>
            <p className="font-medium text-gray-800">{recipientName}</p>
            <p className="text-gray-600">
              {recipient.address1}, {recipient.city}, {recipient.province} {recipient.postalCode}
            </p>
          </div>
        )}

        {/* Card Message */}
        {cardMessage && (
          <div className="mb-6 border-b border-gray-200 pb-6">
            <p className="mb-2 text-sm text-gray-500">Your message</p>
            <p className="italic text-gray-700">"{cardMessage}"</p>
          </div>
        )}

        {/* Totals */}
        {totals && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatSuccessCurrency(totals.subtotal)}</span>
            </div>
            {!isPickup && totals.deliveryFee > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>{formatSuccessCurrency(totals.deliveryFee)}</span>
              </div>
            )}
            {totals.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatSuccessCurrency(totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>{formatSuccessCurrency(totals.tax)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-semibold text-gray-800">
              <span>Total</span>
              <span>{formatSuccessCurrency(totals.total)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="space-y-6 text-center">
        {buyer?.email && (
          <p className="text-gray-500">
            Confirmation sent to <span className="font-medium text-gray-700">{buyer.email}</span>
          </p>
        )}
        <a
          href="/"
          className="inline-block rounded-lg bg-rose-500 px-8 py-3 font-medium text-white transition-colors hover:bg-rose-600"
        >
          Continue Shopping
        </a>
      </div>
    </div>
  );
};

SuccessCard.propTypes = {
  orderResult: PropTypes.shape({
    drafts: PropTypes.array.isRequired,
    buyer: PropTypes.object,
    recipient: PropTypes.object,
    deliveryDate: PropTypes.string,
    cardMessage: PropTypes.string,
    isPickup: PropTypes.bool,
    cartItems: PropTypes.array,
    totals: PropTypes.object,
  }).isRequired,
};

export default SuccessCard;
