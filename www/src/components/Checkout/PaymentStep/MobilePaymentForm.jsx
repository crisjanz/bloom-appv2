import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { PaymentElement } from "@stripe/react-stripe-js";
import { MobileTextArea, MobileSectionHeader } from "../shared/MobileInputs";
import { PAYMENT_ELEMENT_OPTIONS } from "../shared/constants";

const MobilePaymentForm = ({
  data,
  errors,
  onChange,
  cardError,
  onCardChange,
  savedCards,
  savedCardsLoading,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  cart,
  formatCurrency,
  coupon,
  couponInput,
  onCouponInputChange,
  couponMessage,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  applyingCoupon,
  subtotal,
  deliveryFee,
  tax,
  total,
  discountAmount,
  discountLabel,
  couponFreeShipping,
}) => (
  <div className="space-y-0">
    <MobileSectionHeader>Coupon Code</MobileSectionHeader>
    <div className="bg-white px-4 py-4 dark:bg-dark-2">
      <form className="flex flex-col gap-3" onSubmit={onApplyCoupon}>
        <input
          type="text"
          value={couponInput}
          onChange={(event) => onCouponInputChange(event.target.value)}
          placeholder="Enter coupon code"
          className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-base text-dark outline-hidden focus:border-primary dark:border-dark-3 dark:text-white"
          disabled={applyingCoupon}
        />
        <button
          type="submit"
          disabled={applyingCoupon || !couponInput.trim()}
          className="w-full rounded-full bg-dark py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-dark/60 dark:bg-primary"
        >
          {coupon ? "Reapply" : "Apply Coupon"}
        </button>
      </form>
      {couponMessage && (
        <p className="text-success mt-2 text-sm">{couponMessage}</p>
      )}
      {couponError && (
        <p className="text-red-500 mt-2 text-sm">{couponError}</p>
      )}
      {coupon && (
        <button
          type="button"
          onClick={onRemoveCoupon}
          className="mt-2 text-sm text-body-color underline dark:text-dark-6"
        >
          Remove coupon
        </button>
      )}
    </div>

    <MobileSectionHeader>Payment Details</MobileSectionHeader>
    <div className="space-y-3 bg-white px-4 py-4 dark:bg-dark-2">
      <p className="text-sm text-body-color dark:text-dark-6">
        Secure checkout powered by Stripe.
      </p>

      {/* Saved Cards Selection */}
      {savedCardsLoading && (
        <p className="text-sm text-body-color">Loading saved cards...</p>
      )}
      {savedCards.length > 0 && (
        <div className="space-y-2">
          {savedCards.map((card) => (
            <label
              key={card.id}
              className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer transition ${
                selectedPaymentMethod === card.id
                  ? "border-primary bg-primary/5"
                  : "border-stroke dark:border-dark-3"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={card.id}
                checked={selectedPaymentMethod === card.id}
                onChange={() => onSelectPaymentMethod(card.id)}
                className="h-4 w-4 text-primary"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-dark dark:text-white">
                  {card.brand} •••• {card.last4}
                </span>
                <span className="ml-2 text-xs text-body-color dark:text-dark-6">
                  Expires {card.expMonth}/{card.expYear}
                </span>
              </div>
            </label>
          ))}
          <label
            className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer transition ${
              selectedPaymentMethod === "new"
                ? "border-primary bg-primary/5"
                : "border-stroke dark:border-dark-3"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="new"
              checked={selectedPaymentMethod === "new"}
              onChange={() => onSelectPaymentMethod("new")}
              className="h-4 w-4 text-primary"
            />
            <span className="text-sm font-medium text-dark dark:text-white">
              Use a new card
            </span>
          </label>
        </div>
      )}

      {/* New Card Input */}
      {selectedPaymentMethod === "new" && (
        <div className="rounded-md border border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-dark">
          <PaymentElement options={PAYMENT_ELEMENT_OPTIONS} onChange={onCardChange} />
        </div>
      )}
      {cardError && <p className="text-red-500 text-xs">{cardError}</p>}
    </div>

    <MobileSectionHeader>Additional Notes</MobileSectionHeader>
    <div className="bg-white dark:bg-dark-2">
      <MobileTextArea
        label="Notes"
        name="notes"
        value={data.notes}
        onChange={onChange}
        placeholder="Any special requests..."
      />
    </div>

    <MobileSectionHeader>Order Summary</MobileSectionHeader>
    <div className="bg-white dark:bg-dark-2">
      <div className="space-y-2 px-4 py-4">
        {cart.map((item) => (
          <div key={`${item.id}-${item.variantId || "base"}`} className="flex items-center justify-between text-sm">
            <span className="text-dark dark:text-white">
              {item.name} × {item.quantity}
            </span>
            <span className="font-semibold text-dark dark:text-white">
              {formatCurrency(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-stroke/30 px-4 py-4 dark:border-dark-3/30">
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
            <span className={couponFreeShipping ? "line-through" : ""}>{formatCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-body-color dark:text-dark-6">
            <span>Tax</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between border-t border-stroke/30 pt-2 text-base font-semibold text-dark dark:border-dark-3/30 dark:text-white">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-white px-4 py-4 dark:bg-dark-2">
      <label className="flex items-start gap-3 text-sm text-body-color dark:text-dark-6">
        <input
          type="checkbox"
          name="agreeToTerms"
          checked={data.agreeToTerms}
          onChange={onChange}
          className="mt-1 h-4 w-4 rounded border border-stroke text-primary focus:ring-primary"
        />
        I agree to Bloom&apos;s{" "}
        <Link to="/terms" className="text-primary underline">
          Terms &amp; Conditions
        </Link>
      </label>

      {errors.agreeToTerms && (
        <p className="text-red-500 mt-2 text-xs">{errors.agreeToTerms}</p>
      )}
      {errors.cart && <p className="text-red-500 mt-2 text-xs">{errors.cart}</p>}
    </div>
  </div>
);

MobilePaymentForm.propTypes = {
  data: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  cardError: PropTypes.string.isRequired,
  onCardChange: PropTypes.func.isRequired,
  savedCards: PropTypes.array.isRequired,
  savedCardsLoading: PropTypes.bool.isRequired,
  selectedPaymentMethod: PropTypes.string.isRequired,
  onSelectPaymentMethod: PropTypes.func.isRequired,
  cart: PropTypes.array.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  coupon: PropTypes.object,
  couponInput: PropTypes.string.isRequired,
  onCouponInputChange: PropTypes.func.isRequired,
  couponMessage: PropTypes.string,
  couponError: PropTypes.string,
  onApplyCoupon: PropTypes.func.isRequired,
  onRemoveCoupon: PropTypes.func.isRequired,
  applyingCoupon: PropTypes.bool.isRequired,
  subtotal: PropTypes.number.isRequired,
  deliveryFee: PropTypes.number.isRequired,
  tax: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  discountAmount: PropTypes.number.isRequired,
  discountLabel: PropTypes.string.isRequired,
  couponFreeShipping: PropTypes.bool.isRequired,
};

export default MobilePaymentForm;
