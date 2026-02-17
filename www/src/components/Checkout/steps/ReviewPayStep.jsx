import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { PaymentElement } from '@stripe/react-stripe-js';
import { PAYMENT_ELEMENT_OPTIONS } from '../shared/constants';
import OrderSummary from './OrderSummary.jsx';

const ReviewPayStep = ({
  orderType,
  recipient,
  customer,
  deliveryDate,
  occasionLabel,
  cardMessage,
  cart,
  formatCurrency,
  formatDate,
  onEditStep,
  subtotal,
  deliveryFee,
  tax,
  total,
  discountAmount,
  discountLabel,
  couponFreeShipping,
  coupon,
  couponInput,
  onCouponInputChange,
  couponMessage,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  applyingCoupon,
  payment,
  errors,
  onPaymentChange,
  cardError,
  onCardChange,
  savedCards,
  savedCardsLoading,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  submitError,
  isSubmitting,
  onBack,
  onPlaceOrder,
}) => {
  const [couponExpanded, setCouponExpanded] = useState(Boolean(coupon));
  const [notesExpanded, setNotesExpanded] = useState(Boolean(payment.notes));

  return (
    <div className="space-y-6">
      <OrderSummary
        recipient={recipient}
        orderType={orderType}
        deliveryDate={deliveryDate}
        customer={customer}
        occasion={occasionLabel}
        cardMessage={cardMessage}
        formatDate={formatDate}
        onEditStep={onEditStep}
      />

      <div className="rounded-md border border-stroke p-4 dark:border-dark-3">
        <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">Cart items</h4>
        <div className="space-y-2">
          {cart.map((item) => (
            <div
              key={`${item.id}-${item.variantId || 'base'}`}
              className="flex items-center justify-between gap-3 text-sm text-body-color dark:text-dark-6"
            >
              <span>
                {item.name} x {item.quantity}
              </span>
              <span className="font-medium text-dark dark:text-white">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-stroke p-4 dark:border-dark-3">
        <button
          type="button"
          onClick={() => setCouponExpanded((prev) => !prev)}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {couponExpanded ? 'Hide coupon' : 'Have a coupon?'}
        </button>

        {couponExpanded && (
          <form className="mt-3" onSubmit={onApplyCoupon}>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(event) => onCouponInputChange(event.target.value)}
                placeholder="Coupon code"
                className="h-11 flex-1 rounded-md border border-stroke bg-transparent px-4 text-sm text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:text-white"
                disabled={applyingCoupon}
              />
              <button
                type="submit"
                disabled={applyingCoupon || !couponInput.trim()}
                className="rounded-md bg-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-dark/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {coupon ? 'Reapply' : 'Apply'}
              </button>
            </div>
            {couponMessage && <p className="mt-2 text-sm text-success">{couponMessage}</p>}
            {couponError && <p className="mt-2 text-sm text-red-500">{couponError}</p>}
            {coupon && (
              <button
                type="button"
                onClick={onRemoveCoupon}
                className="mt-2 text-sm font-medium text-body-color hover:text-primary"
              >
                Remove coupon
              </button>
            )}
          </form>
        )}
      </div>

      <div className="rounded-md border border-stroke p-4 dark:border-dark-3">
        <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">Order total</h4>
        <div className="space-y-2 text-sm text-body-color dark:text-dark-6">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between">
              <span>{discountLabel}</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{couponFreeShipping ? 'Delivery (waived)' : 'Delivery fee'}</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (estimate)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-dark dark:text-white">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-stroke p-4 dark:border-dark-3">
        <p className="text-sm font-semibold text-dark dark:text-white">Payment</p>
        <p className="mt-1 text-sm text-body-color dark:text-dark-6">Secure checkout powered by Stripe.</p>

        {savedCardsLoading && <p className="mt-3 text-sm text-body-color">Loading saved cards...</p>}

        {savedCards.length > 0 && (
          <div className="mt-3 space-y-2">
            {savedCards.map((card) => (
              <label
                key={card.id}
                className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition ${
                  selectedPaymentMethod === card.id
                    ? 'border-primary bg-primary/5'
                    : 'border-stroke dark:border-dark-3'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={card.id}
                  checked={selectedPaymentMethod === card.id}
                  onChange={() => onSelectPaymentMethod(card.id)}
                  className="h-4 w-4"
                />
                <div className="text-sm text-dark dark:text-white">
                  {card.brand} •••• {card.last4} <span className="text-body-color dark:text-dark-6">({card.expMonth}/{card.expYear})</span>
                </div>
              </label>
            ))}

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition ${
                selectedPaymentMethod === 'new'
                  ? 'border-primary bg-primary/5'
                  : 'border-stroke dark:border-dark-3'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="new"
                checked={selectedPaymentMethod === 'new'}
                onChange={() => onSelectPaymentMethod('new')}
                className="h-4 w-4"
              />
              <span className="text-sm text-dark dark:text-white">Use a new card</span>
            </label>
          </div>
        )}

        {selectedPaymentMethod === 'new' && (
          <div className="mt-4 rounded-md border border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-dark">
            <PaymentElement options={PAYMENT_ELEMENT_OPTIONS} onChange={onCardChange} />
          </div>
        )}

        {cardError && <p className="mt-2 text-sm text-red-500">{cardError}</p>}

        {selectedPaymentMethod === 'new' && (
          <label className="mt-3 flex items-center gap-2 text-sm text-body-color dark:text-dark-6">
            <input
              type="checkbox"
              name="saveCard"
              checked={Boolean(payment.saveCard)}
              onChange={onPaymentChange}
              className="h-4 w-4 rounded border border-stroke text-primary focus:ring-primary"
            />
            Save card for future purchases
          </label>
        )}
      </div>

      <div className="rounded-md border border-stroke p-4 dark:border-dark-3">
        <button
          type="button"
          onClick={() => setNotesExpanded((prev) => !prev)}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {notesExpanded ? 'Hide florist notes' : 'Add notes for the florist'}
        </button>

        {notesExpanded && (
          <textarea
            name="notes"
            value={payment.notes || ''}
            onChange={onPaymentChange}
            rows={4}
            placeholder="Optional notes"
            className="mt-3 w-full rounded-md border border-stroke bg-transparent p-4 text-sm text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:text-white"
          />
        )}
      </div>

      <div className="rounded-md border border-stroke p-4 dark:border-dark-3">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-body-color dark:text-dark-6">
          <input
            type="checkbox"
            name="agreeToTerms"
            checked={Boolean(payment.agreeToTerms)}
            onChange={onPaymentChange}
            className="mt-1 h-4 w-4 rounded border border-stroke text-primary focus:ring-primary"
          />
          <span>
            I agree to{' '}
            <Link to="/terms" className="font-semibold text-primary hover:underline">
              Terms & Conditions
            </Link>
          </span>
        </label>
        {errors.agreeToTerms && <p className="mt-2 text-sm text-red-500">{errors.agreeToTerms}</p>}
        {errors.cart && <p className="mt-2 text-sm text-red-500">{errors.cart}</p>}
      </div>

      {submitError && <p className="text-sm font-medium text-red-500">{submitError}</p>}

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-stroke px-6 py-3 text-sm font-semibold text-dark transition hover:border-primary hover:text-primary dark:border-dark-3 dark:text-white"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={isSubmitting}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Placing order...' : 'Place Order'}
        </button>
      </div>
    </div>
  );
};

ReviewPayStep.propTypes = {
  orderType: PropTypes.oneOf(['DELIVERY', 'PICKUP']).isRequired,
  recipient: PropTypes.object.isRequired,
  customer: PropTypes.object.isRequired,
  deliveryDate: PropTypes.string,
  occasionLabel: PropTypes.string,
  cardMessage: PropTypes.string,
  cart: PropTypes.array.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
  onEditStep: PropTypes.func.isRequired,
  subtotal: PropTypes.number.isRequired,
  deliveryFee: PropTypes.number.isRequired,
  tax: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  discountAmount: PropTypes.number.isRequired,
  discountLabel: PropTypes.string.isRequired,
  couponFreeShipping: PropTypes.bool.isRequired,
  coupon: PropTypes.object,
  couponInput: PropTypes.string.isRequired,
  onCouponInputChange: PropTypes.func.isRequired,
  couponMessage: PropTypes.string,
  couponError: PropTypes.string,
  onApplyCoupon: PropTypes.func.isRequired,
  onRemoveCoupon: PropTypes.func.isRequired,
  applyingCoupon: PropTypes.bool.isRequired,
  payment: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  onPaymentChange: PropTypes.func.isRequired,
  cardError: PropTypes.string,
  onCardChange: PropTypes.func.isRequired,
  savedCards: PropTypes.array.isRequired,
  savedCardsLoading: PropTypes.bool.isRequired,
  selectedPaymentMethod: PropTypes.string.isRequired,
  onSelectPaymentMethod: PropTypes.func.isRequired,
  submitError: PropTypes.string,
  isSubmitting: PropTypes.bool.isRequired,
  onBack: PropTypes.func.isRequired,
  onPlaceOrder: PropTypes.func.isRequired,
};

export default ReviewPayStep;
