import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { PaymentElement } from '@stripe/react-stripe-js';
import { PAYMENT_ELEMENT_OPTIONS } from '../shared/constants';

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
  onOpenTermsModal,
  onBack,
  onPlaceOrder,
}) => {
  const [couponExpanded, setCouponExpanded] = useState(Boolean(coupon));
  const [notesExpanded, setNotesExpanded] = useState(Boolean(payment.notes));

  const recipientName = useMemo(
    () => [recipient.firstName, recipient.lastName].filter(Boolean).join(' ').trim() || 'Recipient',
    [recipient.firstName, recipient.lastName],
  );

  const customerName = useMemo(
    () => [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'Customer',
    [customer.firstName, customer.lastName],
  );

  const deliveryAddress = useMemo(() => {
    const cityProvince = [recipient.city, recipient.province].filter(Boolean).join(', ');
    return [recipient.address1, recipient.address2, cityProvince, recipient.postalCode].filter(Boolean).join(', ');
  }, [recipient.address1, recipient.address2, recipient.city, recipient.province, recipient.postalCode]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="space-y-4 lg:space-y-5">
        <div className="rounded-xl border border-stroke bg-white p-4 sm:p-5 dark:border-dark-3 dark:bg-dark-2">
          <h4 className="text-base font-semibold text-dark dark:text-white">Payment options</h4>
          <p className="mt-1 text-sm text-body-color dark:text-dark-6">Secure checkout powered by Stripe.</p>

          {savedCardsLoading && <p className="mt-4 text-sm text-body-color">Loading saved cards...</p>}

          <div className="mt-4 space-y-2">
            {savedCards.map((card) => (
              <label
                key={card.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 transition ${
                  selectedPaymentMethod === card.id
                    ? 'bg-primary/10 ring-1 ring-primary'
                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-dark-3/40 dark:hover:bg-dark-3'
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
                  {card.brand} •••• {card.last4}{' '}
                  <span className="text-body-color dark:text-dark-6">({card.expMonth}/{card.expYear})</span>
                </div>
              </label>
            ))}

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 transition ${
                selectedPaymentMethod === 'new'
                  ? 'bg-primary/10 ring-1 ring-primary'
                  : 'bg-gray-50 hover:bg-gray-100 dark:bg-dark-3/40 dark:hover:bg-dark-3'
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

          {selectedPaymentMethod === 'new' && (
            <div className="mt-4 rounded-lg border border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-dark">
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

        <div className="rounded-xl border border-stroke bg-white p-4 sm:p-5 dark:border-dark-3 dark:bg-dark-2">
          <div className="divide-y divide-stroke/70 dark:divide-dark-3">
            <div className="pb-4">
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

            <div className="py-4">
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

            <div className="pt-4">
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
                  <button
                    type="button"
                    onClick={onOpenTermsModal}
                    className="font-semibold text-primary hover:underline"
                  >
                    Terms & Conditions
                  </button>
                </span>
              </label>
              {errors.agreeToTerms && <p className="mt-2 text-sm text-red-500">{errors.agreeToTerms}</p>}
              {errors.cart && <p className="mt-2 text-sm text-red-500">{errors.cart}</p>}
            </div>
          </div>
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

      <aside className="lg:pl-1">
        <div className="rounded-xl border border-stroke bg-white p-4 sm:p-5 dark:border-dark-3 dark:bg-dark-2 lg:sticky lg:top-24">
          <h4 className="text-base font-semibold text-dark dark:text-white">Order summary</h4>

          <div className="mt-4 divide-y divide-stroke/70 dark:divide-dark-3">
            <section className="pb-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-dark dark:text-white">Delivery</p>
                <button
                  type="button"
                  onClick={() => onEditStep(1)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-1 text-sm text-body-color dark:text-dark-6">
                <p>{orderType === 'PICKUP' ? 'Pickup order' : 'Delivery order'}</p>
                <p>Recipient: {recipientName}</p>
                {orderType === 'DELIVERY' && <p>{deliveryAddress || 'Address pending'}</p>}
                <p>Date: {formatDate(deliveryDate)}</p>
              </div>
            </section>

            <section className="py-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-dark dark:text-white">Card message</p>
                <button
                  type="button"
                  onClick={() => onEditStep(2)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-1 text-sm text-body-color dark:text-dark-6">
                <p>Occasion: {occasionLabel || 'None selected'}</p>
                <p>{cardMessage || 'No card message'}</p>
              </div>
            </section>

            <section className="py-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-dark dark:text-white">Your info</p>
                <button
                  type="button"
                  onClick={() => onEditStep(3)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-1 text-sm text-body-color dark:text-dark-6">
                <p>{customerName}</p>
                <p>{customer.email || 'No email'}</p>
                <p>{customer.phone || 'No phone'}</p>
              </div>
            </section>

            <section className="py-4">
              <p className="mb-2 text-sm font-semibold text-dark dark:text-white">Cart items</p>
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
            </section>

            <section className="pt-4">
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
            </section>
          </div>
        </div>
      </aside>
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
  onOpenTermsModal: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onPlaceOrder: PropTypes.func.isRequired,
};

export default ReviewPayStep;
