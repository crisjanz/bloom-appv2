import { useState } from "react";
import PropTypes from "prop-types";

const MobileStickyBottomSummary = ({
  cart,
  subtotal,
  deliveryFee,
  tax,
  total,
  discountAmount,
  discountLabel,
  coupon,
  couponFreeShipping,
  formatCurrency,
  formatDate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-stroke bg-tg-bg shadow-lg dark:border-dark-3 md:hidden">
      {isExpanded && (
        <div className="max-h-[60vh] overflow-y-auto border-b border-stroke p-4 dark:bg-dark-2 dark:border-dark-3">
          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={`${item.id}-${item.variantId || "base"}`}
                className="flex items-start justify-between text-sm"
              >
                <div className="flex-1">
                  <p className="font-medium text-dark dark:text-white">{item.name}</p>
                  <p className="text-xs text-body-color dark:text-dark-6">
                    {item.variantName ? `${item.variantName} • ` : ""}
                    {formatDate(item.deliveryDate || null)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-body-color dark:text-dark-6">Qty {item.quantity}</p>
                  <p className="font-semibold text-dark dark:text-white">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
            <div className="border-t border-stroke/30 pt-3 dark:border-dark-3/30">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-body-color dark:text-dark-6">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>{discountLabel}</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-body-color dark:text-dark-6">
                  <span>Delivery{couponFreeShipping ? " (waived)" : ""}</span>
                  <span className={couponFreeShipping ? "line-through" : ""}>
                    {formatCurrency(deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between text-body-color dark:text-dark-6">
                  <span>Tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-2 dark:bg-dark-2"
      >
        <div className="flex items-center gap-3">
          <svg
            className="h-6 w-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-body-color dark:text-dark-6">Total</span>
            <span className="text-lg font-bold text-dark dark:text-white">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 16 8"
          className={`text-body-color transition-transform dark:text-dark-6 ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          <path
            fill="currentColor"
            d="M0.25 1.422 6.795 7.577C7.116 7.866 7.504 7.995 7.886 7.995c.403 0 .786-.167 1.091-.441L15.534 1.423c.293-.294.375-.811.023-1.162-.292-.292-.806-.375-1.157-.029L7.886 6.351 1.362.217C1.042-.058.542-.059.222.261c-.274.32-.275.82.046 1.141Z"
          />
        </svg>
      </button>
    </div>
  );
};

MobileStickyBottomSummary.propTypes = {
  cart: PropTypes.array.isRequired,
  subtotal: PropTypes.number.isRequired,
  deliveryFee: PropTypes.number.isRequired,
  tax: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  discountAmount: PropTypes.number.isRequired,
  discountLabel: PropTypes.string.isRequired,
  coupon: PropTypes.object,
  couponFreeShipping: PropTypes.bool.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
};

export default MobileStickyBottomSummary;
