import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { CardElement } from "@stripe/react-stripe-js";
import { TextAreaGroup, CheckboxGroup } from "../shared/DesktopInputs";
import { CARD_ELEMENT_OPTIONS } from "../shared/constants";

const DesktopPaymentForm = ({
  data,
  onChange,
  errors,
  cardError,
  onCardChange,
  savedCards,
  savedCardsLoading,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  cart,
  formatCurrency,
  deliveryDateLabel,
  recipient,
  customer,
  totals,
  discountLabel,
  coupon,
  couponFreeShipping,
}) => {
  return (
    <>
      <div className="w-full px-3">
        <div className="rounded-md border border-stroke p-5 dark:border-dark-3">
          <p className="text-lg font-semibold text-dark dark:text-white">Payment details</p>
          <p className="mt-1 text-sm text-body-color dark:text-dark-6">
            Secure checkout powered by Stripe.
          </p>

          {/* Saved Cards Selection */}
          {savedCardsLoading && (
            <p className="mt-4 text-sm text-body-color">Loading saved cards...</p>
          )}
          {savedCards.length > 0 && (
            <div className="mt-4 space-y-2">
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
                    name="paymentMethodDesktop"
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
                  name="paymentMethodDesktop"
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
            <div className="mt-4 rounded-md border border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-dark">
              <CardElement options={CARD_ELEMENT_OPTIONS} onChange={onCardChange} />
            </div>
          )}
          {cardError && <p className="text-red-500 mt-2 text-sm">{cardError}</p>}
        </div>
      </div>

      <TextAreaGroup
        labelTitle="Notes for the florist"
        placeholder="Optional: delivery window preference, surprises, etc."
        name="notes"
        value={data.notes}
        onChange={onChange}
      />

      <div className="w-full px-3">
        <div className="rounded-md border border-stroke p-5 dark:border-dark-3">
          <p className="mb-4 text-lg font-semibold text-dark dark:text-white">
            Order review
          </p>

          <div className="space-y-2 text-sm text-body-color dark:text-dark-6">
            <p>
              <span className="font-semibold text-dark dark:text-white">Recipient:</span>{" "}
              {recipient.firstName} {recipient.lastName}
            </p>
            <p>
              <span className="font-semibold text-dark dark:text-white">Delivery date:</span>{" "}
              {deliveryDateLabel}
            </p>
            <p>
              <span className="font-semibold text-dark dark:text-white">Buyer:</span>{" "}
              {customer.firstName} {customer.lastName} ({customer.email})
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {cart.map((item) => (
              <div key={`${item.id}-${item.variantId || "base"}`} className="flex justify-between">
                <span className="text-base text-dark dark:text-white">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-base font-semibold text-dark dark:text-white">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1 border-t border-stroke pt-3 text-sm dark:border-dark-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{totals.subtotal}</span>
            </div>
            {totals.discount && (
              <div className="flex justify-between">
                <span>{discountLabel}</span>
                <span>-{totals.discount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{couponFreeShipping ? "Delivery (waived)" : "Delivery"}</span>
              <span>{totals.deliveryFee}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (estimate)</span>
              <span>{totals.tax}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-dark dark:text-white">
              <span>Total</span>
              <span>{totals.total}</span>
            </div>
          </div>
        </div>
      </div>

      <CheckboxGroup
        labelTitle={
          <>
            I agree to{" "}
            <Link to="/terms" className="text-primary underline">
              Terms &amp; Conditions
            </Link>
          </>
        }
        name="agreeToTerms"
        checked={data.agreeToTerms}
        onChange={onChange}
      />
      {errors.agreeToTerms && (
        <p className="text-red-500 px-3 -mt-4 mb-2 text-sm">{errors.agreeToTerms}</p>
      )}
      {errors.cart && (
        <p className="text-red-500 px-3 -mt-2 text-sm">{errors.cart}</p>
      )}
    </>
  );
};

DesktopPaymentForm.propTypes = {
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  cardError: PropTypes.string.isRequired,
  onCardChange: PropTypes.func.isRequired,
  savedCards: PropTypes.array.isRequired,
  savedCardsLoading: PropTypes.bool.isRequired,
  selectedPaymentMethod: PropTypes.string.isRequired,
  onSelectPaymentMethod: PropTypes.func.isRequired,
  cart: PropTypes.array.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  deliveryDateLabel: PropTypes.string.isRequired,
  recipient: PropTypes.object.isRequired,
  customer: PropTypes.object.isRequired,
  totals: PropTypes.object.isRequired,
  discountLabel: PropTypes.string.isRequired,
  coupon: PropTypes.object,
  couponFreeShipping: PropTypes.bool.isRequired,
};

export default DesktopPaymentForm;
